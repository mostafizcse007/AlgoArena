'use client';

import React, { useState } from 'react';
import { ShieldAlert, X, Zap, Loader2, AlertTriangle, Flame } from 'lucide-react';
import { playHack, playPass, playFail } from '@/lib/audio/sfx';

interface SabotageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  problemId: string;
  defenderCode: string;
  oracleCode: string;
  inputValidatorCode: string;
  onSuccessfulHack: (adversarialInput: Record<string, unknown>, attackerOracleOutput: unknown, defenderOutput: unknown) => void;
}

const GREEDY_TRAP_COUNTEREXAMPLE = {
  V: 5,
  edges: [
    [0, 1, 1],
    [1, 4, 19],
    [0, 2, 2],
    [2, 3, 2],
    [3, 4, 2],
  ],
};

export function SabotageDrawer({
  isOpen,
  onClose,
  defenderCode,
  oracleCode,
  inputValidatorCode,
  onSuccessfulHack,
}: SabotageDrawerProps) {
  const [adversarialJson, setAdversarialJson] = useState<string>(
    JSON.stringify(GREEDY_TRAP_COUNTEREXAMPLE, null, 2)
  );
  const [evaluating, setEvaluating] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ status: 'success' | 'defended' | 'invalid'; text: string; details?: string } | null>(null);

  if (!isOpen) return null;

  const handleLaunchSabotage = () => {
    setEvaluating(true);
    setResultMessage(null);

    try {
      const parsedInput = JSON.parse(adversarialJson);

      // 1. Run Input Validator
      let validatorFn: ((input: unknown) => string | null) | null = null;
      try {
        validatorFn = new Function(`return (${inputValidatorCode})`)() as (input: unknown) => string | null;
      } catch {
        validatorFn = () => null;
      }

      const validationError = validatorFn ? validatorFn(parsedInput) : null;
      if (validationError) {
        setEvaluating(false);
        playFail();
        setResultMessage({
          status: 'invalid',
          text: `Invalid Adversarial Input: ${validationError}`,
        });
        return;
      }

      // 2. Run Canonical Oracle Solution
      let oracleFn: ((...args: unknown[]) => unknown) | null = null;
      try {
        const wrappedOracle = `return (function() { ${oracleCode}; return typeof shortestPath === 'function' ? shortestPath : typeof lengthOfLIS === 'function' ? lengthOfLIS : typeof maxArea === 'function' ? maxArea : typeof maxNonOverlapping === 'function' ? maxNonOverlapping : maxSlidingWindow; })()`;
        oracleFn = new Function(wrappedOracle)() as (...args: unknown[]) => unknown;
      } catch (err: unknown) {
        console.error('Oracle parse error', err);
      }

      // 3. Run Defender (or Buggy Sabotage Code)
      let defenderFn: ((...args: unknown[]) => unknown) | null = null;
      try {
        const wrappedDefender = `return (function() { ${defenderCode}; return typeof shortestPath === 'function' ? shortestPath : typeof lengthOfLIS === 'function' ? lengthOfLIS : typeof maxArea === 'function' ? maxArea : typeof maxNonOverlapping === 'function' ? maxNonOverlapping : maxSlidingWindow; })()`;
        defenderFn = new Function(wrappedDefender)() as (...args: unknown[]) => unknown;
      } catch (err: unknown) {
        console.error('Defender parse error', err);
      }

      const params = parsedInput.V !== undefined && parsedInput.edges !== undefined
        ? [parsedInput.V, parsedInput.edges]
        : parsedInput.nums !== undefined && parsedInput.k !== undefined
        ? [parsedInput.nums, parsedInput.k]
        : parsedInput.nums !== undefined
        ? [parsedInput.nums]
        : parsedInput.height !== undefined
        ? [parsedInput.height]
        : parsedInput.intervals !== undefined
        ? [parsedInput.intervals]
        : Object.values(parsedInput);

      const oracleOut = oracleFn ? oracleFn(...params) : null;
      let defenderOut = null;
      let defenderErrored = false;

      try {
        defenderOut = defenderFn ? defenderFn(...params) : null;
      } catch {
        defenderErrored = true;
      }

      setEvaluating(false);

      // Check if Defender diverged from Oracle (SUCCESSFUL HACK!)
      const isMismatch = defenderErrored || JSON.stringify(oracleOut) !== JSON.stringify(defenderOut);

      if (isMismatch) {
        playHack();
        playPass();
        setResultMessage({
          status: 'success',
          text: `Successful Hack: Opponent produced ${JSON.stringify(defenderOut)} vs Oracle ${JSON.stringify(oracleOut)}`,
        });
        setTimeout(() => {
          onSuccessfulHack(parsedInput, oracleOut, defenderOut);
          onClose();
        }, 1200);
      } else {
        playFail();
        setResultMessage({
          status: 'defended',
          text: `Defended: Both returned ${JSON.stringify(oracleOut)}. No divergence found.`,
          details: 'Hint: Construct an input where immediate local greedy choices miss a cheaper composite multi-edge detour.',
        });
      }
    } catch (parseErr: unknown) {
      setEvaluating(false);
      playFail();
      setResultMessage({
        status: 'invalid',
        text: `JSON Parse Error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      });
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-[#161B26] border-r border-white/[0.1] shadow-[0_24px_48px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] bg-[#1D2333]">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <div className="font-display font-semibold text-xs text-[#F3F4F6]">Hack &amp; Defend Sabotage</div>
            <div className="text-[11px] text-[#9CA3AF]">Adversarial Test Injection</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto text-xs">
        <p className="text-[#9CA3AF] leading-relaxed text-xs font-sans">
          Submit an input that breaks your opponent&apos;s solution.
        </p>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[#9CA3AF] text-xs font-medium">
              Adversarial JSON Parameters:
            </label>
            <button
              type="button"
              onClick={() => setAdversarialJson(JSON.stringify(GREEDY_TRAP_COUNTEREXAMPLE, null, 2))}
              className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-sky-300 border border-white/[0.08] transition cursor-pointer flex items-center gap-1"
              title="Load counterexample where Greedy returns 20 vs Oracle 6"
            >
              <Zap className="w-3 h-3 text-sky-400" />
              <span>Load Greedy Trap</span>
            </button>
          </div>
          <textarea
            rows={8}
            value={adversarialJson}
            onChange={(e) => setAdversarialJson(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-[#F3F4F6] font-mono text-xs focus:outline-none focus:border-sky-400/50 resize-none shadow-inner"
          />
        </div>

        {/* Feedback Banner */}
        {resultMessage && (
          <div className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
            resultMessage.status === 'success'
              ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
              : resultMessage.status === 'defended'
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              {resultMessage.status === 'success' && <Flame className="w-4 h-4 text-rose-400 fill-current" />}
              {resultMessage.status === 'defended' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {resultMessage.status === 'invalid' && <X className="w-4 h-4 text-rose-400" />}
              <span>{resultMessage.text}</span>
            </div>
            {resultMessage.details && (
              <div className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">{resultMessage.details}</div>
            )}
          </div>
        )}

        <button
          onClick={handleLaunchSabotage}
          disabled={evaluating}
          className="w-full py-2.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/30 disabled:opacity-50 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer mt-auto"
        >
          {evaluating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating Adversarial Probe...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Submit Counterexample</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
