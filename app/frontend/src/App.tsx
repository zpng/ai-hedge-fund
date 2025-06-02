import { useState, useEffect } from 'react';
import { Flow } from './components/flow';
import { Layout } from './components/layout';
import { Login } from './components/auth/login';
import { UserProfile } from './components/auth/user-profile';
import { AuthProvider, useAuth } from './contexts/auth-context';
import { Button } from './components/ui/button';

function AppContent() {
  const [showLeftSidebar] = useState(false);
  const [showRightSidebar] = useState(false);
  const [showProfile, setShowProfile] = useState(true); // 默认显示个人中心
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // 登录后自动显示个人中心页面
  useEffect(() => {
    if (isAuthenticated) {
      setShowProfile(true);
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (showProfile) {
    return (
      <UserProfile onGoToComponents={() => setShowProfile(false)} />
    );
  }

  return (
    <Layout
      leftSidebar={showLeftSidebar ? <div className="p-4 text-white">Left Sidebar Content</div> : undefined}
      rightSidebar={showRightSidebar ? (
        <div className="p-4 text-white space-y-4">
          <div className="text-sm">
            <div className="font-semibold">用户信息</div>
            <div>手机号: {user?.phone}</div>
            <div>订阅: {user?.subscription_type === 'trial' ? '试用版' : user?.subscription_type === 'monthly' ? '月付会员' : '年付会员'}</div>
            {user?.subscription_type === 'trial' && (
              <div>剩余调用: {user?.api_calls_remaining}</div>
            )}
          </div>
          <div className="space-y-2">
            <Button 
              onClick={() => setShowProfile(true)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              用户设置
            </Button>
            <Button 
              onClick={logout}
              variant="outline"
              size="sm"
              className="w-full"
            >
              退出登录
            </Button>
          </div>
        </div>
      ) : undefined}
    >
      <Flow />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
