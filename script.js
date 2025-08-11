// 設定 - 実際の値に置き換えてください
const SUPABASE_URL = 'https://mwfedumfttaieuyxjwkd.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZmVkdW1mdHRhaWV1eXhqd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQ4NTQsImV4cCI6MjA3MDQwMDg1NH0.LttuBoNzgqcD3Q6fawpIovkMmeMaHZatMFoSkMAWaGI';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51R27Cr4EFW7uFJL1PrNOqs228JHAtvFOohV0oJBNwSPBRoHWKcYtLdjW4Xi10iYwrj3Z9gH3OjgXCDqxI7n20Rk4000u1Teb5t';

// Supabaseクライアント初期化
let supabase, stripe;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Supabase initialization error:', error);
    alert('Supabaseの初期化に失敗しました。設定を確認してください。');
}

// Stripe初期化
try {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    console.log('Stripe initialized successfully');
} catch (error) {
    console.error('Stripe initialization error:', error);
    alert('Stripeの初期化に失敗しました。設定を確認してください。');
}

// DOM要素
const elements = {
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    getStartedBtn: document.getElementById('getStartedBtn'),
    landingSection: document.getElementById('landingSection'),
    dashboardSection: document.getElementById('dashboardSection'),
    userEmail: document.getElementById('userEmail'),
    subscriptionStatus: document.getElementById('subscriptionStatus'),
    subscribeSection: document.getElementById('subscribeSection'),
    subscribedSection: document.getElementById('subscribedSection'),
    subscribeBtn: document.getElementById('subscribeBtn'),
    manageSubscriptionBtn: document.getElementById('manageSubscriptionBtn'),
    cancelSubscriptionBtn: document.getElementById('cancelSubscriptionBtn'),
    loading: document.getElementById('loading')
};

// 現在のユーザー情報
let currentUser = null;
let userSubscription = null;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization...');

    // Stripeからのリダイレクトを処理
    checkUrlParams();
    
    // 要素の存在確認
    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            console.log(`✓ ${key} element found`);
        } else {
            console.error(`✗ ${key} element not found`);
        }
    });
    
    // ローディング表示
    showLoading();
    
    try {
        // 認証状態の確認
        console.log('Checking auth session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
        }
        
        if (session) {
            console.log('User is logged in:', session.user.email);
            currentUser = session.user;
            await handleUserLogin();
        } else {
            console.log('User is not logged in');
            showLandingPage();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showLandingPage();
    }
    
    hideLoading();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 認証状態の変更を監視
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await handleUserLogin();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userSubscription = null;
            showLandingPage();
        }
    });
    
    console.log('Initialization complete');
});

// イベントリスナーの設定
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', handleGoogleLogin);
        console.log('Login button listener added');
    }
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button listener added');
    }
    
    if (elements.getStartedBtn) {
        elements.getStartedBtn.addEventListener('click', handleGoogleLogin);
        console.log('Get started button listener added');
    }
    
    if (elements.subscribeBtn) {
        elements.subscribeBtn.addEventListener('click', handleSubscribe);
        console.log('Subscribe button listener added');
    }
    
    if (elements.manageSubscriptionBtn) {
        elements.manageSubscriptionBtn.addEventListener('click', handleManageSubscription);
        console.log('Manage subscription button listener added');
    }
    
    if (elements.cancelSubscriptionBtn) {
        elements.cancelSubscriptionBtn.addEventListener('click', handleCancelSubscription);
        console.log('Cancel subscription button listener added');
    }
}

// Google認証
async function handleGoogleLogin() {
    console.log('Google login button clicked');
    
    if (!supabase) {
        alert('Supabaseが初期化されていません。');
        return;
    }
    
    try {
        showLoading();
        console.log('Starting Google OAuth...');
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `https://ksmt305.github.io/spasub/`
            }
        });
        
        console.log('OAuth response:', { data, error });
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('ログインエラー:', error);
        alert(`ログインに失敗しました: ${error.message}`);
        hideLoading();
    }
}

// ログアウト
async function handleLogout() {
    try {
        showLoading();
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('ログアウトエラー:', error);
        alert('ログアウトに失敗しました。');
    }
    hideLoading();
}

// ユーザーログイン処理
async function handleUserLogin() {
    try {
        // サブスクリプション状態を取得
        await fetchUserSubscription();
        showDashboard();
    } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        alert('ユーザー情報の取得に失敗しました。');
    }
}

// 改良されたサブスクリプション状態取得
async function fetchUserSubscription() {
    try {
        console.log('サブスクリプション取得開始 - ユーザーID:', currentUser.id);
        
        // 最初にテーブルの存在とアクセス権限を確認
        const { count, error: countError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUser.id);

        if (countError) {
            console.error('テーブルアクセスエラー:', countError);
            // テーブルが存在しないまたはアクセス権限がない場合
            if (countError.code === '42P01' || countError.code === '42501') {
                console.warn('subscriptionsテーブルが存在しないか、アクセス権限がありません');
                userSubscription = null;
                return;
            }
            throw countError;
        }

        console.log('ユーザーのサブスクリプション件数:', count);

        if (count === 0) {
            console.log('サブスクリプションが見つかりません');
            userSubscription = null;
            return;
        }

        // 全サブスクリプションを取得してログ出力
        const { data: allData, error: allError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (allError) {
            console.error('サブスクリプション取得エラー:', allError);
            throw allError;
        }

        console.log('取得したサブスクリプション:', allData);

        if (!allData || allData.length === 0) {
            userSubscription = null;
            return;
        }

        // アクティブなサブスクリプションを優先的に選択
        const activeStatuses = ['active', 'trialing', 'past_due'];
        let selectedSubscription = null;

        // まずアクティブなものを探す
        for (const status of activeStatuses) {
            selectedSubscription = allData.find(sub => sub.status === status);
            if (selectedSubscription) {
                console.log(`${status}状態のサブスクリプションを発見`);
                break;
            }
        }

        // アクティブなものがなければ最新のものを使用
        if (!selectedSubscription) {
            selectedSubscription = allData[0];
            console.log('最新のサブスクリプション（非アクティブ）を使用:', selectedSubscription.status);
        }

        userSubscription = selectedSubscription;
        console.log('選択されたサブスクリプション:', {
            id: userSubscription.id,
            status: userSubscription.status,
            stripe_subscription_id: userSubscription.stripe_subscription_id,
            created_at: userSubscription.created_at
        });

    } catch (error) {
        console.error('サブスクリプション取得エラー:', error);
        userSubscription = null;
        
        // デバッグ用：エラーの詳細をアラートで表示
        if (error.message) {
            console.error('エラー詳細:', error.message);
        }
    }
}

// サブスクリプション開始
async function handleSubscribe() {
    try {
        showLoading();
        console.log('サブスクリプション開始処理');
        
        // Edge Function の URL を修正（functions/v1/ を使用）
        const functionUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/create-checkout-session`;
        console.log('Function URL:', functionUrl);
        
        // リクエストボディをログ出力
        const requestBody = {
            userId: currentUser.id,
            email: currentUser.email,
            priceId: 'price_1RuZcC4EFW7uFJL1g3akE5ix'
        };
        console.log('Request body:', requestBody);
        
        // Stripe Checkoutセッションを作成
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                // 追加のヘッダー
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`チェックアウトセッションの作成に失敗: ${response.status} ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('Response data:', responseData);
        
        if (!responseData.sessionId) {
            throw new Error('セッションIDが返されませんでした');
        }
        
        // Stripe Checkoutにリダイレクト
        console.log('Redirecting to Stripe with session:', responseData.sessionId);
        const { error } = await stripe.redirectToCheckout({
            sessionId: responseData.sessionId
        });
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('サブスクリプションエラー:', error);
        alert(`サブスクリプションの開始に失敗しました: ${error.message}`);
        hideLoading();
    }
}

// サブスクリプション管理（修正版）
async function handleManageSubscription() {
    try {
        showLoading();
        
        if (!userSubscription || !userSubscription.stripe_customer_id) {
            throw new Error('サブスクリプション情報が見つかりません');
        }
        
        console.log('カスタマーポータル作成:', userSubscription.stripe_customer_id);
        
        const functionUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/create-customer-portal`;
        
        // カスタマーポータルセッションを作成
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                customerId: userSubscription.stripe_customer_id,
                returnUrl: window.location.origin
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`カスタマーポータルの作成に失敗: ${errorText}`);
        }
        
        const { url } = await response.json();
        
        // カスタマーポータルにリダイレクト
        window.location.href = url;
        
    } catch (error) {
        console.error('サブスクリプション管理エラー:', error);
        alert(`サブスクリプション管理画面の表示に失敗しました: ${error.message}`);
        hideLoading();
    }
}

// サブスクリプション解約（修正版）
async function handleCancelSubscription() {
    if (!confirm('本当にサブスクリプションを解約しますか？')) {
        return;
    }
    
    try {
        showLoading();
        
        if (!userSubscription || !userSubscription.stripe_subscription_id) {
            throw new Error('サブスクリプション情報が見つかりません');
        }
        
        const functionUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/cancel-subscription`;
        
        // サブスクリプションをキャンセル
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                subscriptionId: userSubscription.stripe_subscription_id
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`サブスクリプションの解約に失敗: ${errorText}`);
        }
        
        // サブスクリプション状態を更新
        await fetchUserSubscription();
        showDashboard();
        
        alert('サブスクリプションが解約されました。');
        
    } catch (error) {
        console.error('サブスクリプション解約エラー:', error);
        alert(`サブスクリプションの解約に失敗しました: ${error.message}`);
    }
    
    hideLoading();
}

// ランディングページを表示
function showLandingPage() {
    elements.landingSection.style.display = 'block';
    elements.dashboardSection.style.display = 'none';
    elements.loginBtn.style.display = 'block';
    elements.logoutBtn.style.display = 'none';
}

// ダッシュボードを表示（改良版）
function showDashboard() {
    elements.landingSection.style.display = 'none';
    elements.dashboardSection.style.display = 'block';
    elements.loginBtn.style.display = 'none';
    elements.logoutBtn.style.display = 'block';
    
    // ユーザー情報を表示
    elements.userEmail.textContent = currentUser.email;
    
    // サブスクリプション状態を詳細表示
    if (userSubscription) {
        const status = userSubscription.status;
        let statusText = 'サブスクリプション状態: ';
        let statusClass = 'subscription-status ';
        
        switch (status) {
            case 'active':
                statusText += '有効';
                statusClass += 'active';
                break;
            case 'trialing':
                statusText += 'トライアル中';
                statusClass += 'active';
                break;
            case 'past_due':
                statusText += '支払い遅延';
                statusClass += 'warning';
                break;
            case 'canceled':
                statusText += 'キャンセル済み';
                statusClass += 'inactive';
                break;
            case 'incomplete':
                statusText += '未完了';
                statusClass += 'warning';
                break;
            case 'incomplete_expired':
                statusText += '期限切れ';
                statusClass += 'inactive';
                break;
            case 'unpaid':
                statusText += '未払い';
                statusClass += 'inactive';
                break;
            default:
                statusText += status || '不明';
                statusClass += 'inactive';
        }
        
        elements.subscriptionStatus.textContent = statusText;
        elements.subscriptionStatus.className = statusClass;
        
        // アクティブな状態の場合のみサブスク済みとして扱う
        if (['active', 'trialing'].includes(status)) {
            elements.subscribeSection.style.display = 'none';
            elements.subscribedSection.style.display = 'block';
        } else {
            elements.subscribeSection.style.display = 'block';
            elements.subscribedSection.style.display = 'none';
        }
        
        console.log('ダッシュボード表示 - サブスクリプション状態:', status);
    } else {
        elements.subscriptionStatus.textContent = 'サブスクリプション状態: 未契約';
        elements.subscriptionStatus.className = 'subscription-status inactive';
        elements.subscribeSection.style.display = 'block';
        elements.subscribedSection.style.display = 'none';
        console.log('ダッシュボード表示 - サブスクリプション未契約');
    }
}

// ローディング表示
function showLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'flex';
    }
}

// ローディング非表示
function hideLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'none';
    }
}

// URLパラメータをチェック（修正版）
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('success')) {
        console.log('Stripe checkout成功のリダイレクト');
        // 成功時の処理 - 少し遅延を入れてWebhookの処理を待つ
        setTimeout(async () => {
            try {
                await fetchUserSubscription();
                if (currentUser) {
                    showDashboard();
                }
                alert('サブスクリプションが正常に開始されました！');
            } catch (error) {
                console.error('サブスクリプション状態の更新に失敗:', error);
                alert('サブスクリプションは開始されましたが、状態の取得に失敗しました。ページを再読み込みしてください。');
            }
        }, 2000); // 2秒の遅延
        
        // URLからパラメータを削除
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('canceled')) {
        console.log('Stripe checkoutキャンセル');
        // キャンセル時の処理
        alert('サブスクリプションの開始がキャンセルされました。');
        
        // URLからパラメータを削除
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// デバッグ用関数（グローバルに公開）
window.debugSubscriptionStatus = async function() {
    console.log('=== サブスクリプション診断開始 ===');
    
    if (!currentUser) {
        console.error('ユーザーがログインしていません');
        return;
    }
    
    console.log('現在のユーザーID:', currentUser.id);
    console.log('現在のユーザーemail:', currentUser.email);
    
    try {
        // 1. データベースの全サブスクリプションレコードを確認
        console.log('--- 全サブスクリプション確認 ---');
        const { data: allSubs, error: allError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (allError) {
            console.error('全サブスクリプション取得エラー:', allError);
            console.error('エラーコード:', allError.code);
            console.error('エラー詳細:', allError.details);
        } else {
            console.log('ユーザーの全サブスクリプション:', allSubs);
            console.log('サブスクリプション件数:', allSubs?.length || 0);
        }
        
        // 2. テーブル構造の確認
        console.log('--- テーブル構造確認 ---');
        const { data: tableInfo, error: tableError } = await supabase
            .from('subscriptions')
            .select('*')
            .limit(1);
        
        if (!tableError && tableInfo && tableInfo.length > 0) {
            console.log('テーブルの列:', Object.keys(tableInfo[0]));
        } else if (tableError) {
            console.error('テーブル構造確認エラー:', tableError);
        }
        
        // 3. RLS（Row Level Security）の確認
        console.log('--- RLS設定確認 ---');
        const { data: userData } = await supabase.auth.getUser();
        console.log('認証済みユーザー:', userData?.user?.id);
        
        // 4. 現在の取得ロジックをテスト
        console.log('--- 現在のフェッチロジック ---');
        await fetchUserSubscription();
        console.log('fetchUserSubscription実行後のuserSubscription:', userSubscription);
        
    } catch (error) {
        console.error('診断中にエラーが発生:', error);
    }
    
    console.log('=== サブスクリプション診断終了 ===');
};

// 手動でサブスクリプション状態を再取得する関数
window.refreshSubscriptionStatus = async function() {
    if (!currentUser) {
        alert('ログインしていません');
        return;
    }
    
    showLoading();
    try {
        await fetchUserSubscription();
        showDashboard();
        console.log('サブスクリプション状態を更新しました');
    } catch (error) {
        console.error('更新エラー:', error);
        alert('更新に失敗しました: ' + error.message);
    }
    hideLoading();
};
