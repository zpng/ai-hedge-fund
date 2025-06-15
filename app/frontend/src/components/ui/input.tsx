import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-black shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          // 移动端兼容性样式
          "text-base md:text-sm", // 在移动端使用16px字体大小防止iOS自动缩放
          "-webkit-appearance-none appearance-none", // 重置webkit默认样式
          "touch-manipulation", // 优化触摸交互
          // Safari移动端特殊修复
          "[color:#000000!important]", // 强制设置文字颜色为黑色
          "[-webkit-text-fill-color:#000000!important]", // 修复Safari文字颜色问题
          "[background-color:transparent!important]", // 强制透明背景
          "[caret-color:#000000]", // 确保光标颜色为黑色
          "focus:[color:#000000!important]", // 聚焦时保持文字颜色为黑色
          "focus:[-webkit-text-fill-color:#000000!important]", // 聚焦时保持文字颜色为黑色
          "focus:[background-color:transparent!important]", // 聚焦时保持透明背景
          className
        )}
        ref={ref}
        {...props}
        // 添加Safari兼容性属性
        autoComplete={props.autoComplete || "off"}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
