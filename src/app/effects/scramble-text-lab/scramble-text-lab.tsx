"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./scramble-text-lab.module.css";

type CharacterMode = "blocks" | "symbols" | "numbers" | "braille";

const characterModes: CharacterMode[] = [
  "blocks",
  "symbols",
  "numbers",
  "braille",
];

const characterSets: Record<CharacterMode, string[]> = {
  blocks: Array.from("█▓▒░▄▀▐▌▚▞▙▟▛▜"),
  symbols: Array.from("!<>-_\\/[]{}=+*^?#$%&"),
  numbers: Array.from("0123456789"),
  braille: Array.from("⠁⠃⠇⠋⠟⠿⡿⣿⣶⣤⢀⢠⢰⣀⣄"),
};

const payloads = [
  ["DECRYPT", "THE SIGNAL"],
  ["TRACE", "LOST MEMORY"],
  ["BUILD", "FRONTEND EFFECTS"],
];

const revealHoldFrames = 18;
const frameDelay = 38;

function pickScrambleChar(
  chars: string[],
  frame: number,
  lineIndex: number,
  charIndex: number,
  runId: number,
) {
  const signal =
    Math.sin((frame + 1) * 12.9898 + lineIndex * 78.233 + charIndex * 37.719 + runId) *
    43758.5453;

  return chars[Math.floor((signal - Math.floor(signal)) * chars.length)];
}

function getLineFrameLimit(line: string) {
  return line.length * 2 + revealHoldFrames;
}

function scrambleLine(
  line: string,
  chars: string[],
  frame: number,
  lineIndex: number,
  runId: number,
) {
  return Array.from(line)
    .map((targetChar, charIndex) => {
      if (targetChar === " ") {
        return " ";
      }

      const characterFrame = frame - charIndex * 2;

      if (characterFrame >= revealHoldFrames) {
        return targetChar;
      }

      return pickScrambleChar(chars, frame, lineIndex, charIndex, runId);
    })
    .join("");
}

type ScrambleTextLabProps = {
  variant?: "full" | "preview";
};

export function ScrambleTextLab({ variant = "full" }: ScrambleTextLabProps) {
  const [mode, setMode] = useState<CharacterMode>("blocks");
  const [payloadIndex, setPayloadIndex] = useState(0);
  const [frame, setFrame] = useState(0);
  const [runId, setRunId] = useState(1);

  const activePayload = payloads[payloadIndex];
  const frameLimit = useMemo(
    () => Math.max(...activePayload.map(getLineFrameLimit)),
    [activePayload],
  );

  const scrambledLines = useMemo(
    () =>
      activePayload.map((line, lineIndex) =>
        scrambleLine(line, characterSets[mode], frame, lineIndex, runId),
      ),
    [activePayload, frame, mode, runId],
  );

  const progress = Math.min(100, Math.round((frame / frameLimit) * 100));
  const seed = `0x${(0xf03d + runId * 733 + payloadIndex * 97)
    .toString(16)
    .toUpperCase()}-${mode.slice(0, 4).toUpperCase()}`;

  const replay = useCallback(() => {
    setPayloadIndex((current) => (current + 1) % payloads.length);
    setFrame(0);
    setRunId((current) => current + 1);
  }, []);

  const selectMode = useCallback((nextMode: CharacterMode) => {
    setMode(nextMode);
    setFrame(0);
    setRunId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (frame >= frameLimit) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFrame((current) => current + 1);
    }, frameDelay);

    return () => window.clearTimeout(timer);
  }, [frame, frameLimit]);

  useEffect(() => {
    if (frame < frameLimit) {
      return;
    }

    const timer = window.setTimeout(replay, 2600);

    return () => window.clearTimeout(timer);
  }, [frame, frameLimit, replay]);

  return (
    <div className={styles.lab} data-effect="scramble-text-lab" data-variant={variant}>
      <div className={styles.status} aria-hidden="true">
        <span className={styles.dot} />
        <span>SYNC {progress.toString().padStart(3, "0")}%</span>
      </div>

      <div className={styles.command}>
        <span>root@effects:~$</span>
        <strong>run ./variable-text --chars={mode} --mode=signal</strong>
      </div>

      <div className={styles.screen} aria-live="polite">
        <div className={styles.rain} aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index}>
              {
                characterSets[mode][
                  (index * 3 + frame + runId) % characterSets[mode].length
                ]
              }
            </span>
          ))}
        </div>
        <h3 className={styles.headline}>
          {/* 保持每行独立渲染，避免字符揭示时改变标题块高度。 */}
          {scrambledLines.map((line, index) => (
            <span key={`${payloadIndex}-${index}`}>{line}</span>
          ))}
        </h3>
      </div>

      <div className={styles.controls} aria-label="Scramble character sets">
        <button className={styles.execute} onClick={replay} type="button">
          Execute &gt;
        </button>
        {characterModes.map((characterMode) => (
          <button
            className={styles.mode}
            data-active={mode === characterMode}
            key={characterMode}
            onClick={() => selectMode(characterMode)}
            type="button"
          >
            {characterMode}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <div>
          <span>seed</span>
          <strong>{seed}</strong>
        </div>
        <div>
          <span>vector</span>
          <strong>random -&gt; right -&gt; left</strong>
        </div>
        <div>
          <span>entropy</span>
          <meter max="100" value={progress} />
        </div>
      </div>
    </div>
  );
}
