import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Login() {
  const { register, login, sendVerificationCode, verifyEmail } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [verificationCode, setVerificationCode] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"login" | "register">("login");
  const [registrationStep, setRegistrationStep] = React.useState<"form" | "verify">("form");
  const [error, setError] = React.useState<string | null>(null);
  const [codeSent, setCodeSent] = React.useState(false);

  // 登录处理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入邮箱和密码",
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      toast({
        title: "登录成功",
        description: "欢迎使用AI股票分析系统",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登录失败';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "登录失败",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入邮箱",
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendVerificationCode(email);
      setCodeSent(true);
      toast({
        title: "发送成功",
        description: "验证码已发送到您的邮箱",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发送验证码失败';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "发送失败",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 注册第一步：验证邮箱
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入验证码",
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyEmail(email, verificationCode);
      setRegistrationStep('form');
      toast({
        title: "验证成功",
        description: "邮箱验证成功，请设置密码完成注册",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '验证失败';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "验证失败",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 注册第二步：设置密码并完成注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入密码",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "两次输入的密码不一致",
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register(email, password, inviteCode || undefined);
      toast({
        title: "注册成功",
        description: "注册成功，请登录",
      });
      setActiveTab('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '注册失败';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "注册失败",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            AI股票分析
          </h2>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
                    邮箱
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                    密码
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="mt-1"
                    required
                  />
                </div>

                {error && activeTab === 'login' && (
                  <div className="text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? '登录中...' : '登录'}
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="p-8">
              {registrationStep === 'form' ? (
                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">
                      邮箱
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="请输入邮箱"
                        className="mt-1 flex-1"
                        required
                        disabled={codeSent}
                      />
                      <Button 
                        type="button" 
                        onClick={handleSendCode} 
                        className="mt-1" 
                        disabled={isLoading || codeSent}
                      >
                        {codeSent ? '已发送' : '发送验证码'}
                      </Button>
                    </div>
                  </div>

                  {codeSent && (
                    <div>
                      <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
                        验证码
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          id="verification-code"
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="请输入6位验证码"
                          className="mt-1 flex-1"
                          maxLength={6}
                          required
                        />
                        <Button 
                          type="button" 
                          onClick={handleVerifyEmail} 
                          className="mt-1" 
                          disabled={isLoading}
                          variant="outline"
                        >
                          验证
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">
                      密码
                    </label>
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                      确认密码
                    </label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                      邀请码 (可选)
                    </label>
                    <Input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="输入邀请码可获得5次免费试用"
                      className="mt-1"
                    />
                  </div>

                  {error && activeTab === 'register' && (
                    <div className="text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !codeSent || !verificationCode}
                  >
                    {isLoading ? '注册中...' : '注册'}
                  </Button>
                </form>
              ) : null}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-gray-600">
          <p>使用邀请码注册可获得5次免费API调用</p>
        </div>
      </div>
    </div>
  );
}