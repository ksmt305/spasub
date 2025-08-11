// 設定 - 実際の値に置き換えてください
const SUPABASE_URL = 'https://mwfedumfttaieuyxjwkd.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZmVkdW1mdHRhaWV1eXhqd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQ4NTQsImV4cCI6MjA3MDQwMDg1NH0.LttuBoNzgqcD3Q6fawpIovkMmeMaHZatMFoSkMAWaGI';
//const SUPABASE_ANON_KEY='sb_publishable_mHfI4BMA1xwTb91ey8WCew_nxgOXs96';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51R27Cr4EFW7uFJL1PrNOqs228JHAtvFOohV0oJBNwSPBRoHWKcYtLdjW4Xi10iYwrj3Z9gH3OjgXCDqxI7n20Rk4000u1Teb5t';

// デバッグ用：設定値を確認
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('STRIPE_PUBLISHABLE_KEY:', STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set');

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
    } else {
        console.error('Login button not found');
    }
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button listener added');
    } else {
        console.error('Logout button not found');
    }
    
    if (elements.getStartedBtn) {
        elements.getStartedBtn.addEventListener('click', handleGoogleLogin);
        console.log('Get started button listener added');
    } else {
        console.error('Get started button not found');
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
                //redirectTo: `${window.location.origin}${window.location.pathname}`
                redirectTo: `https://ksmt305.github.io/spasub/`
            }
        });
        
        console.log('OAuth response:', { data, error });
        
        if (error) {
            throw error;
        }
        
        // OAuthの場合、リダイレクトが発生するのでここでローディングを隠す必要はない
        
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

// サブスクリプション状態を取得
async function fetchUserSubscription() {
    try {
        // ステータスが 'active' または 'trialing' のサブスクリプションを検索
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .in('status', ['active', 'trialing']) // 'active' と 'trialing' を許容
            .eq('user_id', currentUser.id)
            .limit(1) // 念のため1件に制限
            .single(); // 1件または0件を期待

        if (error && error.code !== 'PGRST116') { // PGRST116は行が見つからないエラーなので無視
            throw error;
        }

        userSubscription = data;
        console.log('Fetched user subscription:', userSubscription);

    } catch (error) {
        console.error('サブスクリプション取得エラー:', error);
        userSubscription = null;
    }
}

// サブスクリプション開始
async function handleSubscribe() {
    try {
        showLoading();
        
        // Stripe Checkoutセッションを作成
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                userId: currentUser.id,
                email: currentUser.email,
                priceId: 'price_1RuZcC4EFW7uFJL1g3akE5ix' // 実際のPrice IDに置き換え
            })
        });
        
        if (!response.ok) {
            throw new Error('チェックアウトセッションの作成に失敗しました');
        }
        
        const { sessionId } = await response.json();
        
        // Stripe Checkoutにリダイレクト
        const { error } = await stripe.redirectToCheckout({
            sessionId: sessionId
        });
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('サブスクリプションエラー:', error);
        alert('サブスクリプションの開始に失敗しました。もう一度お試しください。');
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
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
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
    
    // サブスクリプション状態を表示
    if (userSubscription) {
        elements.subscriptionStatus.textContent = 'サブスクリプション状態: 有効';
        elements.subscriptionStatus.className = 'subscription-status active';
        elements.subscribeSection.style.display = 'none';
        elements.subscribedSection.style.display = 'block';
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





