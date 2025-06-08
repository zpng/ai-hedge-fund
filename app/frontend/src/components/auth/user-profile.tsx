import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface InviteCode {
  code: string;
  user_id: string;
  created_at: string;
  used_at?: string;
  used_by?: string;
  is_active: boolean;
}

interface UserProfile {
  user: any;
  invite_codes: InviteCode[];
  subscription_info: {
    type: string;
    expires_at?: string;
    api_calls_remaining: number;
    total_api_calls: number;
    new_user_gift_calls: number;
    invite_gift_calls: number;
  };
}

interface UserProfileProps {
  onGoToComponents?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function UserProfile({ onGoToComponents: _onGoToComponents }: UserProfileProps) {
  const { user: _user, token, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || '获取用户信息失败';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "获取信息失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage = '网络错误';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCodes = async () => {
    if (!token) return;

    setIsGeneratingCodes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/generate-invite-codes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchProfile(); // Refresh profile to get new codes
      } else {
        const error = await response.json();
        const errorMessage = error.detail || '生成邀请码失败';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "生成失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage = '网络错误';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const subscribe = async (subscriptionType: 'monthly' | 'yearly') => {
    if (!token) return;

    try {
      // 调用支付创建接口
      const response = await fetch(`${API_BASE_URL}/payment/create?subscription_type=${subscriptionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data.payment_url) {
          // 打开支付链接
          window.open(result.data.payment_url, '_blank');
          
          // 开始轮询支付结果
          const tradeOrderId = result.data.trade_order_id;
          startPollingPaymentStatus(tradeOrderId);
        } else {
          const errorMessage = '获取支付链接失败';
          setError(errorMessage);
          toast({
            variant: "destructive",
            title: "支付失败",
            description: errorMessage,
          });
        }
      } else {
        const error = await response.json();
        const errorMessage = error.detail || '创建支付订单失败';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "支付失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage = '网络错误';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    }
  };
  
  // 轮询支付状态
  const startPollingPaymentStatus = (tradeOrderId: string) => {
    const pollInterval = 3000; // 3秒轮询一次
    const maxAttempts = 20; // 最多轮询20次，约1分钟
    let attempts = 0;
    
    const pollPaymentStatus = async () => {
      if (attempts >= maxAttempts) {
        console.log('支付轮询超时');
        toast({
          variant: "destructive",
          title: "支付状态查询超时",
          description: "请稍后在个人中心查看订阅状态",
        });
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/payment/query/${tradeOrderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            // 检查支付状态
            if (result.data.status === 'OD') { // OD表示支付成功
              // 支付成功，刷新用户信息
              await refreshUser();
              await fetchProfile();
              toast({
                variant: "success",
                title: "支付成功",
                description: "订阅已更新，感谢您的支持！",
              });
              return; // 结束轮询
            }
          }
        }
      } catch (err) {
        console.error('查询支付状态出错:', err);
        toast({
          variant: "destructive",
          title: "查询失败",
          description: "查询支付状态时出现错误",
        });
      }
      
      attempts++;
      setTimeout(pollPaymentStatus, pollInterval);
    };
    
    // 开始轮询
    setTimeout(pollPaymentStatus, pollInterval);
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">加载用户信息失败</div>
      </div>
    );
  }

  const getSubscriptionBadgeColor = (type: string) => {
    switch (type) {
      case 'yearly': return 'bg-purple-100 text-purple-800';
      case 'monthly': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubscriptionText = (type: string) => {
    switch (type) {
      case 'yearly': return '年付会员';
      case 'monthly': return '月付会员';
      case 'trial': return '试用版';
      default: return type;
    }
  };

  const handleGoToComponents = () => {
    try {
      // 直接使用navigate进行导航，不再依赖回调函数
      navigate('/components');
    } catch (err) {
      toast({
        variant: "destructive",
        title: "导航失败",
        description: "页面跳转失败，请重试",
      });
    }
  };

  const handleLogout = () => {
    try {
      logout();
      toast({
        title: "已退出登录",
        description: "您已成功退出登录",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "退出失败",
        description: "退出登录失败，请重试",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">个人中心</h1>
            <p className="mt-2 text-gray-600">管理您的账户信息和订阅</p>
          </div>
          <Button 
            onClick={handleGoToComponents}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            进入组件页面
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-600">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 用户信息 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">账户信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">手机号</label>
                <div className="mt-1 text-sm text-gray-900">{profile.user.phone}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">注册时间</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(profile.user.created_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">订阅状态</label>
                <div className="mt-1">
                  <Badge className={getSubscriptionBadgeColor(profile.subscription_info.type)}>
                    {getSubscriptionText(profile.subscription_info.type)}
                  </Badge>
                </div>
              </div>
              {profile.subscription_info.type === 'trial' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">剩余API调用次数</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {profile.subscription_info.api_calls_remaining}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">赠送次数详情</label>
                    <div className="mt-1 space-y-1 text-sm text-gray-600">
                      <div>新用户赠送: {profile.subscription_info.new_user_gift_calls} 次</div>
                      <div>邀请码赠送: {profile.subscription_info.invite_gift_calls} 次</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* 邀请码管理 */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">邀请码管理</h2>
              {profile.invite_codes.length === 0 && (
                <Button 
                  onClick={generateInviteCodes} 
                  disabled={isGeneratingCodes}
                  size="sm"
                >
                  {isGeneratingCodes ? '生成中...' : '生成邀请码'}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {profile.invite_codes.map((code) => (
                <div key={code.code} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium">{code.code}</div>
                    <div className="text-sm text-gray-600">
                      创建于 {new Date(code.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div>
                    {code.used_at ? (
                      <Badge variant="secondary">已使用</Badge>
                    ) : (
                      <Badge variant="success">可用</Badge>
                    )}
                  </div>
                </div>
              ))}
              {profile.invite_codes.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  暂无邀请码，点击生成按钮创建
                </div>
              )}
            </div>
          </Card>

          {/* 订阅管理 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">订阅管理</h2>
            {profile.subscription_info.type === 'trial' ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">升级到付费版本，享受无限API调用</p>
                <div className="space-y-3">
                  <Button 
                    onClick={() => subscribe('monthly')}
                    className="w-full"
                    variant="outline"
                  >
                    月付会员 - ¥66/首月，之后¥88/月
                  </Button>
                  <Button 
                    onClick={() => subscribe('yearly')}
                    className="w-full"
                  >
                    年付会员 - ¥880/首年，之后¥968/年
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-green-600 font-semibold mb-2">您已是付费用户</div>
                <div className="text-gray-600">享受无限API调用服务</div>
              </div>
            )}
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button onClick={handleLogout} variant="outline">
            退出登录
          </Button>
        </div>
      </div>
    </div>
  );
}