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

// ログアウト処理を改善
async function handleLogout() {
    console.log('ログアウト処理開始');
    
    try {
        showLoading();
        
        // タイムアウトを設定（10秒）
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ログアウト処理がタイムアウトしました')), 10000);
        });
        
        // ログアウト処理
        const logoutPromise = supabase.auth.signOut();
        
        // タイムアウトとログアウト処理のレース
        const { error } = await Promise.race([logoutPromise, timeoutPromise]);
        
        if (error) {
            throw error;
        }
        
        console.log('ログアウト成功');
        
    } catch (error) {
        console.error('ログアウトエラー:', error);
        
        // エラーが発生してもクライアントサイドの状態をクリア
        console.log('強制的にクライアントサイドの状態をクリア');
        currentUser = null;
        userSubscription = null;
        
        // 手動でランディングページを表示
        showLandingPage();
        
        // エラーメッセージを表示（タイムアウトの場合は別メッセージ）
        if (error.message.includes('タイムアウト')) {
            alert('ログアウトに時間がかかっていますが、ローカルの状態はクリアされました。');
        } else {
            alert(`ログアウトエラー: ${error.message}`);
        }
    } finally {
        hideLoading();
    }
}

// より堅牢な認証状態変更監視
function setupAuthStateListener() {
    let authStateChangeTimeout;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // 既存のタイムアウトをクリア
        if (authStateChangeTimeout) {
            clearTimeout(authStateChangeTimeout);
        }
        
        // 状態変更の処理にタイムアウトを設定
        authStateChangeTimeout = setTimeout(async () => {
            try {
                if (event === 'SIGNED_IN' && session) {
                    currentUser = session.user;
                    await handleUserLogin();
                } else if (event === 'SIGNED_OUT') {
                    console.log('認証状態: ログアウト確認');
                    currentUser = null;
                    userSubscription = null;
                    showLandingPage();
                }
            } catch (error) {
                console.error('認証状態変更処理エラー:', error);
                // エラーが発生してもUIは更新する
                if (event === 'SIGNED_OUT') {
                    showLandingPage();
                }
            }
        }, 100); // 100ms後に実行（連続する状態変更をデバウンス）
    });
}

// 初期化処理も改善
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
        // 認証状態の確認にタイムアウトを設定
        const sessionCheckPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('セッションチェックタイムアウト')), 8000);
        });
        
        console.log('Checking auth session...');
        const { data: { session }, error } = await Promise.race([
            sessionCheckPromise, 
            timeoutPromise
        ]);
        
        if (error) {
            console.error('Session check error:', error);
            throw error;
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
        
        if (error.message.includes('タイムアウト')) {
            console.warn('初期化がタイムアウトしました。オフラインまたはネットワークの問題の可能性があります。');
        }
    }
    
    hideLoading();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 改善された認証状態監視を開始
    setupAuthStateListener();
    
    console.log('Initialization complete');
});

// ネットワーク状態をチェックする関数
function checkNetworkStatus() {
    if (!navigator.onLine) {
        console.warn('オフライン状態です');
        return false;
    }
    return true;
}

// より堅牢なユーザーログイン処理
async function handleUserLogin() {
    try {
        if (!checkNetworkStatus()) {
            throw new Error('インターネット接続を確認してください');
        }
        
        // サブスクリプション取得にタイムアウトを設定
        const subscriptionPromise = fetchUserSubscription();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('サブスクリプション取得タイムアウト')), 10000);
        });
        
        await Promise.race([subscriptionPromise, timeoutPromise]);
        showDashboard();
    } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        
        // エラーが発生してもダッシュボードは表示する
        showDashboard();
        
        if (error.message.includes('タイムアウト')) {
            console.warn('サブスクリプション情報の取得がタイムアウトしました。後で再試行してください。');
            // ユーザーにエラーを通知するが、アプリの使用は継続可能
            setTimeout(() => {
                alert('サブスクリプション情報の読み込みに時間がかかっています。ページを再読み込みしてください。');
            }, 1000);
        } else {
            alert('ユーザー情報の取得に失敗しました。');
        }
    }
}

// 緊急ログアウト関数（デバッグ用）
window.emergencyLogout = function() {
    console.log('緊急ログアウト実行');
    currentUser = null;
    userSubscription = null;
    showLandingPage();
    
    // ローカルストレージやセッションストレージもクリア（もしあれば）
    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch (e) {
        console.log('ストレージクリアをスキップ（サポートされていません）');
    }
    
    console.log('緊急ログアウト完了');
};

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

// サブスクリプション管理
async function handleManageSubscription() {
    try {
        showLoading();
        
        if (!userSubscription || !userSubscription.stripe_customer_id) {
            throw new Error('サブスクリプション情報が見つかりません');
        }
        
        // カスタマーポータルセッションを作成
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-customer-portal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerId: userSubscription.stripe_customer_id,
                returnUrl: window.location.origin
            })
        });
        
        if (!response.ok) {
            throw new Error('カスタマーポータルの作成に失敗しました');
        }
        
        const { url } = await response.json();
        
        // カスタマーポータルにリダイレクト
        window.location.href = url;
        
    } catch (error) {
        console.error('サブスクリプション管理エラー:', error);
        alert('サブスクリプション管理画面の表示に失敗しました。');
        hideLoading();
    }
}

// サブスクリプション解約
async function handleCancelSubscription() {
    if (!confirm('本当にサブスクリプションを解約しますか？')) {
        return;
    }
    
    try {
        showLoading();
        
        if (!userSubscription || !userSubscription.stripe_subscription_id) {
            throw new Error('サブスクリプション情報が見つかりません');
        }
        
        // サブスクリプションをキャンセル
        const response = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subscriptionId: userSubscription.stripe_subscription_id
            })
        });
        
        if (!response.ok) {
            throw new Error('サブスクリプションの解約に失敗しました');
        }
        
        // サブスクリプション状態を更新
        await fetchUserSubscription();
        showDashboard();
        
        alert('サブスクリプションが解約されました。');
        
    } catch (error) {
        console.error('サブスクリプション解約エラー:', error);
        alert('サブスクリプションの解約に失敗しました。');
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

// ダッシュボードを表示
function showDashboard() {
    elements.landingSection.style.display = 'none';
    elements.dashboardSection.style.display = 'block';
    elements.loginBtn.style.display = 'none';
    elements.logoutBtn.style.display = 'block';
    
    // ユーザー情報を表示
    elements.userEmail.textContent = currentUser.email;
    
    console.log('Showing dashboard with subscription:', userSubscription);
    
    // サブスクリプション状態を表示
    if (userSubscription && ['active', 'trialing', 'past_due'].includes(userSubscription.status)) {
        const statusText = {
            'active': '有効',
            'trialing': 'トライアル中',
            'past_due': '支払い期限切れ'
        };
        
        elements.subscriptionStatus.textContent = `サブスクリプション状態: ${statusText[userSubscription.status]}`;
        elements.subscriptionStatus.className = 'subscription-status active';
        elements.subscribeSection.style.display = 'none';
        elements.subscribedSection.style.display = 'block';
        
        // 管理ボタンの表示/非表示
        if (userSubscription.stripe_customer_id) {
            elements.manageSubscriptionBtn.style.display = 'inline-block';
        } else {
            elements.manageSubscriptionBtn.style.display = 'none';
            console.warn('No stripe_customer_id found, hiding manage button');
        }
        
        if (userSubscription.stripe_subscription_id) {
            elements.cancelSubscriptionBtn.style.display = 'inline-block';
        } else {
            elements.cancelSubscriptionBtn.style.display = 'none';
            console.warn('No stripe_subscription_id found, hiding cancel button');
        }
        
    } else {
        elements.subscriptionStatus.textContent = 'サブスクリプション状態: 未契約';
        elements.subscriptionStatus.className = 'subscription-status inactive';
        elements.subscribeSection.style.display = 'block';
        elements.subscribedSection.style.display = 'none';
    }
}

// ローディング表示
function showLoading() {
    elements.loading.style.display = 'flex';
}

// ローディング非表示
function hideLoading() {
    elements.loading.style.display = 'none';
}

// URLパラメータをチェック（Stripe Checkoutからのリダイレクト）
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('success')) {
        // 成功時の処理
        setTimeout(async () => {
            await fetchUserSubscription();
            showDashboard();
            alert('サブスクリプションが正常に開始されました！');
        }, 1000);
        
        // URLからパラメータを削除
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('canceled')) {
        // キャンセル時の処理
        alert('サブスクリプションの開始がキャンセルされました。');
        
        // URLからパラメータを削除
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// テスト用の簡単なクリックイベント（デバッグ用）
function addTestClickEvents() {
    // ログインボタンのテスト
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = function() {
            console.log('Login button clicked directly');
            alert('ログインボタンが押されました！設定を確認してからGoogle認証を有効にします。');
        };
    }
    
    // 始めるボタンのテスト
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.onclick = function() {
            console.log('Get started button clicked directly');
            alert('始めるボタンが押されました！設定を確認してからGoogle認証を有効にします。');
        };
    }
}

// DOMロード後にテストイベントを追加（一時的）
// 実際の認証が動作することを確認したら、この行は削除してください
// addTestClickEvents();
