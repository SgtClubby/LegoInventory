// src/app/lib/Misc/DebugCaller.js

export default function getCallerInfo() {
  const stack = new Error().stack?.split("\n");
  const callerLine = stack?.[3];
  const match = callerLine?.match(/\((.*):(\d+):(\d+)\)/);

  if (match) {
    const [, file, line, column] = match;
    return { file, line: Number(line), column: Number(column) };
  }

  return null;
}
