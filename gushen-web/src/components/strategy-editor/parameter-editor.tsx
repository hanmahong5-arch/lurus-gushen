"use client";

/**
 * Parameter Editor Component
 * 参数编辑器组件
 *
 * A visual editor for adjusting strategy parameters extracted from generated code.
 * Supports number, boolean, string parameters with validation and range limits.
 *
 * @module components/strategy-editor/parameter-editor
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  parseStrategyParameters,
  updateStrategyCode,
  validateAllParameters,
  validateCrossParameterRules,
  groupParametersByCategory,
  getCategoryDisplayName,
  type StrategyParameter,
  type ParameterCategory,
  type ParsedStrategyResult,
  type CrossParameterValidationResult,
} from "@/lib/strategy/parameter-parser";
import { ParameterInfoDialog } from "./parameter-info-dialog";
import { hasEnhancedInfo } from "@/lib/strategy/enhanced-parameter-info";

// =============================================================================
// COMPONENT PROPS / 组件属性
// =============================================================================

interface ParameterEditorProps {
  /**
   * The strategy code to parse and edit
   * 要解析和编辑的策略代码
   */
  code: string;

  /**
   * Callback when parameters are updated
   * 参数更新时的回调
   */
  onCodeUpdate?: (newCode: string) => void;

  /**
   * Whether the editor is in read-only mode
   * 是否为只读模式
   */
  readOnly?: boolean;

  /**
   * Callback when rerun backtest is requested
   * 请求重新回测时的回调
   */
  onRerunBacktest?: () => void;

  /**
   * Whether backtest is currently running
   * 回测是否正在运行
   */
  isBacktesting?: boolean;
}

// =============================================================================
// MAIN COMPONENT / 主组件
// =============================================================================

export function ParameterEditor({
  code,
  onCodeUpdate,
  readOnly = false,
  onRerunBacktest,
  isBacktesting = false,
}: ParameterEditorProps) {
  // Parse strategy code to extract parameters
  const parsedResult = useMemo(() => parseStrategyParameters(code), [code]);

  // Local state for parameter values
  const [parameters, setParameters] = useState<StrategyParameter[]>(
    parsedResult.parameters,
  );

  // Track which parameters have been modified
  const [modifiedParams, setModifiedParams] = useState<Set<string>>(new Set());

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cross-parameter validation result
  const [crossValidation, setCrossValidation] = useState<CrossParameterValidationResult | null>(null);

  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<
    Set<ParameterCategory>
  >(() => new Set<ParameterCategory>(["indicator", "signal"]));

  // Sync parameters when code changes
  useEffect(() => {
    setParameters(parsedResult.parameters);
    setModifiedParams(new Set());
    setErrors({});
  }, [parsedResult.parameters]);

  // Group parameters by category
  const groupedParameters = useMemo(
    () => groupParametersByCategory(parameters),
    [parameters],
  );

  // Check if any parameter has been modified
  const hasModifications = modifiedParams.size > 0;

  // Handle parameter value change
  const handleParameterChange = useCallback(
    (name: string, value: number | boolean | string | number[]) => {
      setParameters((prev) =>
        prev.map((p) => (p.name === name ? { ...p, value } : p)),
      );
      setModifiedParams((prev) => new Set(prev).add(name));

      // Clear error for this parameter
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    },
    [],
  );

  // Apply changes to code
  const handleApplyChanges = useCallback(() => {
    // Validate all parameters (individual range validation)
    const validation = validateAllParameters(parameters);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return false;
    }

    // Validate cross-parameter rules
    const crossValidationResult = validateCrossParameterRules(parameters);
    setCrossValidation(crossValidationResult);

    // Block if there are errors (not warnings)
    if (!crossValidationResult.isValid) {
      // Add error messages to errors state for affected params
      const crossErrors: Record<string, string> = {};
      for (const warning of crossValidationResult.warnings) {
        if (warning.severity === "error") {
          for (const param of warning.affectedParams) {
            crossErrors[param] = warning.message;
          }
        }
      }
      setErrors(crossErrors);
      return false;
    }

    // Generate updated code
    const newCode = updateStrategyCode(code, parameters);
    onCodeUpdate?.(newCode);

    // Clear modification tracking
    setModifiedParams(new Set());
    return true;
  }, [code, parameters, onCodeUpdate]);

  // Apply changes and trigger backtest
  const handleApplyAndBacktest = useCallback(() => {
    const success = handleApplyChanges();
    if (success && onRerunBacktest) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        onRerunBacktest();
      }, 100);
    }
  }, [handleApplyChanges, onRerunBacktest]);

  // Reset parameters to original values
  const handleReset = useCallback(() => {
    setParameters(parsedResult.parameters);
    setModifiedParams(new Set());
    setErrors({});
    setCrossValidation(null);
  }, [parsedResult.parameters]);

  // Toggle category expansion
  const toggleCategory = useCallback((category: ParameterCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // No parameters found
  if (parsedResult.parameters.length === 0) {
    return (
      <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-xl p-6">
        <div className="text-center">
          <span className="text-3xl mb-3 block">⚙️</span>
          <h3 className="text-white font-medium mb-2">
            暂无可编辑参数 / No Editable Parameters
          </h3>
          <p className="text-white/50 text-sm">
            {code
              ? "未能从代码中提取到参数，请先生成策略代码。"
              : "请先生成策略代码以提取可编辑参数。"}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {code
              ? "Could not extract parameters from code."
              : "Generate strategy code first to extract parameters."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <span className="text-sm font-medium text-white">
            参数编辑器 / Parameter Editor
          </span>
          {hasModifications && (
            <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded">
              已修改 / Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasModifications && (
            <>
              <button
                onClick={handleReset}
                className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition"
              >
                重置
              </button>
              <button
                onClick={handleApplyChanges}
                className="px-3 py-1 text-xs bg-accent hover:bg-accent/80 text-primary rounded transition"
              >
                应用修改
              </button>
              {/* Apply and backtest button - shown when backtest callback is available */}
              {onRerunBacktest && (
                <button
                  onClick={handleApplyAndBacktest}
                  disabled={isBacktesting}
                  className={cn(
                    "px-3 py-1 text-xs rounded transition flex items-center gap-1",
                    isBacktesting
                      ? "bg-white/10 text-white/40 cursor-not-allowed"
                      : "bg-profit hover:bg-profit/80 text-primary"
                  )}
                >
                  {isBacktesting ? (
                    <>
                      <span className="w-2 h-2 border border-white/30 border-t-white rounded-full animate-spin" />
                      回测中
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      应用并回测
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Strategy info */}
      <div className="px-4 py-3 border-b border-border/50 bg-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">
              {parsedResult.name}
            </h4>
            {parsedResult.description && (
              <p className="text-xs text-white/50 mt-0.5">
                {parsedResult.description}
              </p>
            )}
          </div>
          <div className="text-xs text-white/40">
            {parsedResult.parameters.length} 个参数
          </div>
        </div>

        {/* Indicators used */}
        {parsedResult.indicators.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {parsedResult.indicators.map((ind) => (
              <span
                key={ind.type}
                className="px-2 py-0.5 text-xs bg-profit/20 text-profit rounded"
              >
                {ind.type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Parameters grouped by category */}
      <div className="divide-y divide-border/30">
        {(Object.keys(groupedParameters) as ParameterCategory[]).map(
          (category) => {
            const params = groupedParameters[category];
            if (params.length === 0) return null;

            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category}>
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-2.5 flex items-center justify-between bg-primary/20 hover:bg-primary/30 transition"
                >
                  <span className="text-sm font-medium text-white/80">
                    {getCategoryDisplayName(category)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">
                      {params.length} 项
                    </span>
                    <svg
                      className={cn(
                        "w-4 h-4 text-white/40 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Parameters in category */}
                {isExpanded && (
                  <div className="px-4 py-3 space-y-3">
                    {params.map((param) => (
                      <ParameterInput
                        key={param.name}
                        parameter={param}
                        onChange={handleParameterChange}
                        error={errors[param.name]}
                        isModified={modifiedParams.has(param.name)}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      {/* Cross-parameter validation warnings */}
      {crossValidation && crossValidation.warnings.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-loss/5">
          <div className="space-y-2">
            {crossValidation.warnings.map((warning, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 p-2 rounded text-xs",
                  warning.severity === "error"
                    ? "bg-loss/10 border border-loss/30"
                    : "bg-yellow-500/10 border border-yellow-500/30"
                )}
              >
                <span className="text-base leading-none mt-0.5">
                  {warning.severity === "error" ? "❌" : "⚠️"}
                </span>
                <div className="flex-1">
                  <div className={cn(
                    "font-medium",
                    warning.severity === "error" ? "text-loss" : "text-yellow-400"
                  )}>
                    {warning.message}
                  </div>
                  <div className="text-white/40 text-[10px] mt-0.5">
                    {warning.messageEn}
                  </div>
                  <div className="text-white/30 text-[10px] mt-1">
                    相关参数: {warning.affectedParams.join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border bg-primary/30">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            {hasModifications
              ? "点击「应用并回测」一键完成参数更新和回测"
              : "修改参数后点击「应用修改」更新代码"}
          </p>
          {onRerunBacktest && !hasModifications && (
            <button
              onClick={onRerunBacktest}
              disabled={isBacktesting}
              className={cn(
                "px-4 py-1.5 text-xs rounded transition flex items-center gap-1.5",
                isBacktesting
                  ? "bg-white/10 text-white/40 cursor-not-allowed"
                  : "bg-accent/20 hover:bg-accent/30 text-accent",
              )}
            >
              {isBacktesting ? (
                <>
                  <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  回测中...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  重新回测
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PARAMETER INPUT COMPONENT / 参数输入组件
// =============================================================================

interface ParameterInputProps {
  parameter: StrategyParameter;
  onChange: (name: string, value: number | boolean | string | number[]) => void;
  error?: string;
  isModified: boolean;
  readOnly: boolean;
}

function ParameterInput({
  parameter,
  onChange,
  error,
  isModified,
  readOnly,
}: ParameterInputProps) {
  const { name, displayName, type, value, description, range, unit, step } =
    parameter;

  // State for parameter info dialog (Phase 3 UX enhancement)
  const [showInfo, setShowInfo] = useState(false);
  const hasInfo = hasEnhancedInfo(name);

  // Handle number input change
  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        onChange(name, newValue);
      }
    },
    [name, onChange],
  );

  // Handle boolean toggle
  const handleBooleanChange = useCallback(() => {
    onChange(name, !value);
  }, [name, value, onChange]);

  // Handle string input change
  const handleStringChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(name, e.target.value);
    },
    [name, onChange],
  );

  // Increment/decrement for number type
  const handleIncrement = useCallback(() => {
    if (typeof value === "number") {
      const stepValue = step ?? 1;
      const newValue = value + stepValue;
      if (range?.max === undefined || newValue <= range.max) {
        onChange(name, newValue);
      }
    }
  }, [name, value, step, range, onChange]);

  const handleDecrement = useCallback(() => {
    if (typeof value === "number") {
      const stepValue = step ?? 1;
      const newValue = value - stepValue;
      if (range?.min === undefined || newValue >= range.min) {
        onChange(name, newValue);
      }
    }
  }, [name, value, step, range, onChange]);

  return (
    <div className="group">
      {/* Label row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`param-${name}`}
            className={cn("text-sm text-white/80", isModified && "text-accent")}
          >
            {displayName}
          </label>
          {isModified && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
          {/* Info icon button (Phase 3 UX enhancement) */}
          {hasInfo && (
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="text-white/30 hover:text-white/60 transition-colors p-0.5"
              title="查看参数详细说明"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
        {unit && <span className="text-xs text-white/40">{unit}</span>}
      </div>

      {/* Input based on type */}
      {type === "number" && (
        <div className="flex items-center gap-2">
          {/* Decrement button */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={
              readOnly ||
              (range?.min !== undefined && (value as number) <= range.min)
            }
            className="w-8 h-8 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>

          {/* Number input */}
          <div className="flex-1 relative">
            <input
              type="number"
              id={`param-${name}`}
              value={value as number}
              onChange={handleNumberChange}
              min={range?.min}
              max={range?.max}
              step={step ?? 1}
              disabled={readOnly}
              className={cn(
                "w-full px-3 py-2 bg-primary/50 border rounded text-sm text-white text-center",
                "focus:outline-none focus:ring-2 focus:ring-accent/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                error
                  ? "border-loss focus:ring-loss/50"
                  : isModified
                    ? "border-accent/50"
                    : "border-border",
              )}
            />
            {/* Range indicator */}
            {range && (range.min !== undefined || range.max !== undefined) && (
              <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[10px] text-white/30">
                <span>{range.min ?? "∞"}</span>
                <span>{range.max ?? "∞"}</span>
              </div>
            )}
          </div>

          {/* Increment button */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={
              readOnly ||
              (range?.max !== undefined && (value as number) >= range.max)
            }
            className="w-8 h-8 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      )}

      {type === "boolean" && (
        <button
          type="button"
          onClick={handleBooleanChange}
          disabled={readOnly}
          className={cn(
            "w-full px-3 py-2 rounded text-sm text-left transition",
            "flex items-center justify-between",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value
              ? "bg-profit/20 text-profit border border-profit/30"
              : "bg-primary/50 text-white/60 border border-border",
          )}
        >
          <span>{value ? "启用 / Enabled" : "禁用 / Disabled"}</span>
          <div
            className={cn(
              "w-10 h-5 rounded-full transition relative",
              value ? "bg-profit" : "bg-white/20",
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                value ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </div>
        </button>
      )}

      {type === "string" && (
        <input
          type="text"
          id={`param-${name}`}
          value={value as string}
          onChange={handleStringChange}
          disabled={readOnly}
          className={cn(
            "w-full px-3 py-2 bg-primary/50 border rounded text-sm text-white",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-loss focus:ring-loss/50"
              : isModified
                ? "border-accent/50"
                : "border-border",
          )}
        />
      )}

      {/* Description and error */}
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <p className={cn("text-xs", error ? "text-loss" : "text-white/40")}>
          {error ?? description}
        </p>
        {/* Default value indicator */}
        {isModified && typeof parameter.defaultValue === "number" && (
          <span className="text-[10px] text-white/30 whitespace-nowrap">
            默认: {parameter.defaultValue}
          </span>
        )}
      </div>

      {/* Parameter info dialog (Phase 3 UX enhancement) */}
      {hasInfo && (
        <ParameterInfoDialog
          parameter={parameter}
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          onApplyValue={(newValue) => {
            onChange(name, newValue);
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS / 导出
// =============================================================================

export default ParameterEditor;
