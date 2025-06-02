import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Flow } from './components/Flow';
import { Layout } from './components/Layout';
import { Login } from './components/auth/login';
import { UserProfile } from './components/auth/user-profile';
import { AuthProvider, useAuth } from './contexts/auth-context';
import { Button } from './components/ui/button';

function AppContent() {
  const [showLeftSidebar] = useState(false);
  const [showRightSidebar] = useState(false);
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const navigate = useNavigate();

  // 登录后自动导航到个人中心页面
  useEffect(() => {
    if (isAuthenticated && window.location.pathname === '/') {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

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

  return (
    <Routes>
      <Route path="/home" element={<UserProfile />} />
      <Route path="/components" element={
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
                  onClick={() => navigate('/home')}
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
          <Flow onGoToHome={() => navigate('/home')} />
        </Layout>
      } />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
