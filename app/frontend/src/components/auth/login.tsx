import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, Shield, Sparkles, Eye, EyeOff, X, HelpCircle } from "lucide-react";

export function Login() {
  const { register, login, sendVerificationCode, verifyEmail, sendPasswordResetCode, resetPassword } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [verificationCode, setVerificationCode] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSendingCode, setIsSendingCode] = React.useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"login" | "register">("login");
  const [registrationStep, setRegistrationStep] = React.useState<"form" | "verify">("form");
  const [error, setError] = React.useState<string | null>(null);
  const [codeSent, setCodeSent] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetCode, setResetCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("");
  const [resetStep, setResetStep] = React.useState<"email" | "code" | "password">("email");
  const [isSendingResetCode, setIsSendingResetCode] = React.useState(false);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = React.useState(false);

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

    setIsSendingCode(true);
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
      setIsSendingCode(false);
    }
  };

  // 验证邮箱
  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入验证码",
      });
      return;
    }

    setIsVerifyingEmail(true);
    setError('');

    try {
      await verifyEmail(email, verificationCode);
      setEmailVerified(true);
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
      setIsVerifyingEmail(false);
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

  // 发送密码重置验证码
  const handleSendResetCode = async () => {
    if (!resetEmail.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入邮箱地址",
      });
      return;
    }

    setIsSendingResetCode(true);
    setError('');

    try {
      await sendPasswordResetCode(resetEmail);
      setResetStep('code');
      toast({
        title: "发送成功",
        description: "密码重置验证码已发送到您的邮箱",
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
      setIsSendingResetCode(false);
    }
  };

  // 验证重置验证码并设置新密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetStep === 'code') {
      if (!resetCode.trim()) {
        toast({
          variant: "destructive",
          title: "输入错误",
          description: "请输入验证码",
        });
        return;
      }
      setResetStep('password');
      return;
    }

    if (!newPassword.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入新密码",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "两次输入的密码不一致",
      });
      return;
    }

    setIsResettingPassword(true);
    setError('');

    try {
      await resetPassword(resetEmail, resetCode, newPassword);
      toast({
        title: "重置成功",
        description: "密码重置成功，请使用新密码登录",
      });
      // 重置状态
      setShowForgotPassword(false);
      setResetStep('email');
      setResetEmail('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setActiveTab('login');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '密码重置失败';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "重置失败",
        description: errorMessage,
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* 帮助文档按钮 */}
      <button
        onClick={() => {
          navigator.clipboard.writeText('992562811').then(() => {
            alert('QQ群号已复制到剪贴板：992562811');
          }).catch(() => {
            alert('复制失败，QQ群号：992562811');
          });
        }}
        className="absolute top-4 right-4 z-20 px-3 py-2 bg-white/80 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg hover:bg-white/90 transition-all duration-200 text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer"
        title="点击复制QQ群号：992562811"
      >
        QQ群：992562811
      </button>
      
      {/* 动态渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_60%,rgba(59,130,246,0.15),transparent_50%)]" />
      </div>
      
      {/* 浮动装饰元素 */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-gradient-to-r from-indigo-400/20 to-blue-400/20 rounded-full blur-xl animate-pulse delay-500" />
      
      <div className="relative z-10 max-w-md w-full mx-4">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
            AI股票分析
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            智能投资决策，专业数据分析，支持美股和币，港股和A股研发中
          </p>
          <p className="text-gray-500 mt-1 text-xs">
            支持最新最强大的大模型Gemini 2.5 pro, Claude Sonnet 4, DeepSeek，OpenAI GPT-4.1 o3等
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg">
            <TabsTrigger 
              value="login" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              登录
            </TabsTrigger>
            <TabsTrigger 
              value="register" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              注册
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    邮箱地址
                  </label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入您的邮箱地址"
                      className="pl-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                      required
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    密码
                  </label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入您的密码"
                      className="pl-10 pr-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                      required
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    忘记密码？
                  </button>
                </div>

                {error && activeTab === 'login' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      登录中...
                    </div>
                  ) : (
                    '立即登录'
                  )}
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="register-email" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    邮箱地址
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="请输入您的邮箱地址"
                        className="pl-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                        required
                        disabled={codeSent}
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleSendCode} 
                      className={`h-12 px-6 rounded-xl font-semibold transition-all duration-300 ${
                        codeSent 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                      }`}
                      disabled={isSendingCode || codeSent}
                    >
                      {isSendingCode ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          发送中
                        </div>
                      ) : codeSent ? '已发送' : '发送验证码'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="verification-code" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        id="verification-code"
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="请输入6位验证码"
                        className="pl-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl text-center tracking-widest"
                        maxLength={6}
                        required
                      />
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleVerifyEmail} 
                      className={`h-12 px-6 rounded-xl font-semibold transition-all duration-300 ${
                        emailVerified 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                      }`}
                      disabled={isVerifyingEmail || emailVerified}
                    >
                      {isVerifyingEmail ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          验证中
                        </div>
                      ) : emailVerified ? '已验证' : '验证'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-password" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    设置密码
                  </label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请设置您的密码"
                      className="pl-10 pr-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                      required
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    确认密码
                  </label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码"
                      className="pl-10 pr-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                      required
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="inviteCode" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    邀请码 <span className="text-xs text-gray-500 font-normal">(可选)</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="输入邀请码获得5次免费试用"
                      className="pl-10 h-12 bg-white/50 border-gray-200/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 rounded-xl"
                    />
                    <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {error && activeTab === 'register' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className={`w-full h-12 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
                    emailVerified && email.trim() && password.trim() && confirmPassword.trim() && password === confirmPassword
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={isLoading || !emailVerified || !email.trim() || !password.trim() || !confirmPassword.trim() || password !== confirmPassword}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      注册中...
                    </div>
                  ) : (
                    '注册'
                  )}
                </Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 忘记密码弹窗 */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl p-8 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">重置密码</h2>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetStep('email');
                    setResetEmail('');
                    setResetCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={resetStep === 'email' ? (e) => { e.preventDefault(); handleSendResetCode(); } : handleResetPassword} className="space-y-6">
                {resetStep === 'email' && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="请输入您的邮箱地址"
                          className="pl-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                          required
                        />
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </>
                )}

                {resetStep === 'code' && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="reset-code" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        验证码
                      </label>
                      <div className="relative">
                        <Input
                          id="reset-code"
                          type="text"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          placeholder="请输入验证码"
                          className="pl-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                          required
                        />
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </>
                )}

                {resetStep === 'password' && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        新密码
                      </label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="请输入新密码"
                          className="pl-10 pr-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                          required
                        />
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        确认新密码
                      </label>
                      <div className="relative">
                        <Input
                          id="confirm-new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="请再次输入新密码"
                          className="pl-10 h-12 bg-white/50 border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                          required
                        />
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={isSendingResetCode || isResettingPassword}
                >
                  {resetStep === 'email' && isSendingResetCode ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      发送中...
                    </div>
                  ) : resetStep === 'email' ? (
                    '发送验证码'
                  ) : resetStep === 'code' ? (
                    '下一步'
                  ) : isResettingPassword ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      重置中...
                    </div>
                  ) : (
                    '重置密码'
                  )}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* 底部提示 */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 shadow-lg">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-600">
              使用邀请码注册可获得 <span className="font-semibold text-purple-600">5次免费</span> API调用
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;