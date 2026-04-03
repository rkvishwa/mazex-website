"use client";

import React, {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type Cell = [number, number];
type Point = { x: number; y: number };

const DEFAULT_MAZE_GRID: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const GRID_ROWS = DEFAULT_MAZE_GRID.length;
const GRID_COLS = DEFAULT_MAZE_GRID[0].length;

const START: Cell = [1, 1];
const END: Cell = [11, 11];
const CELL_TRAVEL_MS = 280;
const ARRIVAL_PAUSE_MS = 900;
const NO_ROUTE_MESSAGE = "No route to the goal. Remove a wall to continue.";

function cloneGrid(grid: number[][]) {
  return grid.map((row) => [...row]);
}

function sameCell(first?: Cell | null, second?: Cell | null) {
  return Boolean(
    first &&
      second &&
      first[0] === second[0] &&
      first[1] === second[1]
  );
}

function isWalkable(grid: number[][], cell: Cell) {
  return grid[cell[0]]?.[cell[1]] === 0;
}

function bfs(grid: number[][], start: Cell, end: Cell): Cell[] {
  if (!isWalkable(grid, start) || !isWalkable(grid, end)) {
    return [];
  }

  if (sameCell(start, end)) {
    return [start];
  }

  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  );
  const parents = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as Cell | null)
  );
  const queue: Cell[] = [start];
  const directions: Cell[] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  visited[start[0]][start[1]] = true;

  while (queue.length > 0) {
    const [row, col] = queue.shift()!;

    for (const [dr, dc] of directions) {
      const nextRow = row + dr;
      const nextCol = col + dc;

      if (
        nextRow < 0 ||
        nextRow >= rows ||
        nextCol < 0 ||
        nextCol >= cols ||
        visited[nextRow][nextCol] ||
        grid[nextRow][nextCol] !== 0
      ) {
        continue;
      }

      visited[nextRow][nextCol] = true;
      parents[nextRow][nextCol] = [row, col];
      queue.push([nextRow, nextCol]);

      if (nextRow === end[0] && nextCol === end[1]) {
        const path: Cell[] = [end];
        let cursor: Cell | null = [row, col];

        while (cursor) {
          path.push(cursor);
          cursor = parents[cursor[0]][cursor[1]];
        }

        return path.reverse();
      }
    }
  }

  return [];
}

function cellCenter(row: number, col: number, cellSize: number): Point {
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  };
}

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function normalize(dx: number, dy: number) {
  const length = Math.hypot(dx, dy) || 1;

  return {
    dx: dx / length,
    dy: dy / length,
  };
}

function findRerouteAnchor(
  grid: number[][],
  fromCell: Cell,
  toCell: Cell,
  goal: Cell,
  activePoint: Point,
  cellSize: number
) {
  const candidates = [fromCell, toCell]
    .filter((cell) => isWalkable(grid, cell))
    .map((cell) => {
      const point = cellCenter(cell[0], cell[1], cellSize);
      const reroute = bfs(grid, cell, goal);

      return {
        cell,
        point,
        routeLength: reroute.length,
        canFinish: reroute.length > 0,
      };
    });

  const pool = candidates.some((candidate) => candidate.canFinish)
    ? candidates.filter((candidate) => candidate.canFinish)
    : candidates;

  if (pool.length === 0) {
    return fromCell;
  }

  return pool.reduce((best, candidate) => {
    const bestDistance = distance(activePoint, best.point);
    const candidateDistance = distance(activePoint, candidate.point);

    if (candidateDistance !== bestDistance) {
      return candidateDistance < bestDistance ? candidate : best;
    }

    if (candidate.routeLength !== best.routeLength) {
      return candidate.routeLength > 0 &&
        (best.routeLength === 0 || candidate.routeLength < best.routeLength)
        ? candidate
        : best;
    }

    return best;
  }).cell;
}

function updateTrail(trail: Cell[], cell: Cell) {
  const lastCell = trail[trail.length - 1];

  if (!lastCell || sameCell(lastCell, cell)) {
    return trail;
  }

  const previousCell = trail[trail.length - 2];

  if (previousCell && sameCell(previousCell, cell)) {
    return trail.slice(0, -1);
  }

  return [...trail, cell];
}

function getBacktrackStep(trail: Cell[], grid: number[][]) {
  const previousCell = trail[trail.length - 2];

  return previousCell && isWalkable(grid, previousCell) ? previousCell : null;
}

export default function MazeAnimation({
  size = 240,
  className = "",
  interactive = false,
}: {
  size?: number;
  className?: string;
  interactive?: boolean;
}) {
  const mazeId = useId().replace(/:/g, "");
  const cellSize = size / GRID_COLS;
  const [startCell, setStartCell] = useState<Cell>(START);
  const [endCell, setEndCell] = useState<Cell>(END);
  const startPoint = useMemo(
    () => cellCenter(startCell[0], startCell[1], cellSize),
    [cellSize, startCell]
  );

  const [grid, setGrid] = useState<number[][]>(() => cloneGrid(DEFAULT_MAZE_GRID));
  const [currentCell, setCurrentCell] = useState<Cell>(START);
  const [movingTo, setMovingTo] = useState<Cell | null>(null);
  const [mousePosition, setMousePosition] = useState<Point>(startPoint);
  const [direction, setDirection] = useState(() => normalize(1, 0));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const startCellRef = useRef<Cell>(START);
  const endCellRef = useRef<Cell>(END);
  const currentCellRef = useRef<Cell>(START);
  const movingToRef = useRef<Cell | null>(null);
  const mousePositionRef = useRef<Point>(startPoint);
  const trailRef = useRef<Cell[]>([START]);
  const animationFrameRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden
  );

  useEffect(() => {
    startCellRef.current = startCell;
  }, [startCell]);

  useEffect(() => {
    endCellRef.current = endCell;
  }, [endCell]);

  useEffect(() => {
    currentCellRef.current = currentCell;
  }, [currentCell]);

  useEffect(() => {
    movingToRef.current = movingTo;
  }, [movingTo]);

  useEffect(() => {
    mousePositionRef.current = mousePosition;
  }, [mousePosition]);

  useEffect(() => {
    const anchoredCell = movingToRef.current ?? currentCellRef.current;
    const anchoredPoint = cellCenter(anchoredCell[0], anchoredCell[1], cellSize);

    mousePositionRef.current = anchoredPoint;
    setMousePosition(anchoredPoint);
  }, [cellSize]);

  const route = useMemo(() => bfs(grid, currentCell, endCell), [endCell, grid, currentCell]);

  const robotRadius = cellSize * 0.15;
  const passageClipId = `${mazeId}-passage-clip`;
  const wallGlowId = `${mazeId}-wall-glow`;
  const robotGlowId = `${mazeId}-robot-glow`;
  const robotGradId = `${mazeId}-robot-grad`;
  const isAnimationEnabled = isInViewport && isPageVisible;

  const clearAnimation = useEffectEvent(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  });

  const clearResetTimer = useEffectEvent(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  });

  const syncStatusMessage = useEffectEvent((message: string | null) => {
    setStatusMessage((current) => (current === message ? current : message));
  });

  const stopAtCell = useEffectEvent((cell: Cell) => {
    const cellPoint = cellCenter(cell[0], cell[1], cellSize);

    clearAnimation();
    currentCellRef.current = cell;
    movingToRef.current = null;
    mousePositionRef.current = cellPoint;
    trailRef.current = updateTrail(trailRef.current, cell);

    setCurrentCell(cell);
    setMovingTo(null);
    setMousePosition(cellPoint);
  });

  const pauseAnimation = useEffectEvent(() => {
    clearAnimation();
    clearResetTimer();

    if (!movingToRef.current) {
      return;
    }

    stopAtCell(
      findRerouteAnchor(
        grid,
        currentCellRef.current,
        movingToRef.current,
        endCellRef.current,
        mousePositionRef.current,
        cellSize
      )
    );
  });

  const reverseRun = useEffectEvent(() => {
    clearAnimation();
    clearResetTimer();
    setStatusMessage(null);

    const nextStart = endCellRef.current;
    const nextEnd = startCellRef.current;
    const nextStartPoint = cellCenter(nextStart[0], nextStart[1], cellSize);
    const nextEndPoint = cellCenter(nextEnd[0], nextEnd[1], cellSize);

    startCellRef.current = nextStart;
    endCellRef.current = nextEnd;
    currentCellRef.current = nextStart;
    movingToRef.current = null;
    mousePositionRef.current = nextStartPoint;
    trailRef.current = [nextStart];

    setStartCell(nextStart);
    setEndCell(nextEnd);
    setCurrentCell(nextStart);
    setMovingTo(null);
    setMousePosition(nextStartPoint);
    setDirection(
      normalize(nextEndPoint.x - nextStartPoint.x, nextEndPoint.y - nextStartPoint.y)
    );
  });

  const startStep = useEffectEvent((from: Cell, to: Cell) => {
    const fromPoint = cellCenter(from[0], from[1], cellSize);
    const toPoint = cellCenter(to[0], to[1], cellSize);
    const heading = normalize(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
    let startedAt: number | null = null;

    clearAnimation();
    clearResetTimer();

    movingToRef.current = to;
    setMovingTo(to);
    setDirection(heading);

    const tick = (timestamp: number) => {
      if (startedAt === null) {
        startedAt = timestamp;
      }

      const progress = Math.min((timestamp - startedAt) / CELL_TRAVEL_MS, 1);
      const nextPoint = {
        x: fromPoint.x + (toPoint.x - fromPoint.x) * progress,
        y: fromPoint.y + (toPoint.y - fromPoint.y) * progress,
      };

      mousePositionRef.current = nextPoint;
      setMousePosition(nextPoint);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      animationFrameRef.current = null;
      currentCellRef.current = to;
      movingToRef.current = null;
      mousePositionRef.current = toPoint;
      trailRef.current = updateTrail(trailRef.current, to);

      setCurrentCell(to);
      setMovingTo(null);
      setMousePosition(toPoint);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  });

  function handleCellToggle(row: number, col: number) {
    const cell: Cell = [row, col];

    if (!interactive || sameCell(cell, currentCellRef.current)) {
      return;
    }

    if (sameCell(cell, startCellRef.current) || sameCell(cell, endCellRef.current)) {
      return;
    }

    setStatusMessage(null);

    setGrid((previous) => {
      const next = cloneGrid(previous);
      next[row][col] = next[row][col] === 0 ? 1 : 0;

      return next;
    });
  }

  useEffect(() => {
    const element = containerRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(
          entry.isIntersecting && entry.intersectionRatio >= 0.15
        );
      },
      {
        threshold: [0, 0.15],
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isAnimationEnabled) {
      pauseAnimation();
    }
  }, [isAnimationEnabled]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAnimationEnabled || movingTo) {
      return;
    }

    if (sameCell(currentCell, endCell)) {
      clearResetTimer();
      resetTimerRef.current = window.setTimeout(() => {
        reverseRun();
      }, ARRIVAL_PAUSE_MS);
    }
  }, [currentCell, endCell, isAnimationEnabled, movingTo]);

  useEffect(() => {
    if (!isAnimationEnabled || !movingTo) {
      return;
    }

    const nextStep = route[1];
    const backtrackStep = getBacktrackStep(trailRef.current, grid);

    if (nextStep && sameCell(nextStep, movingTo) && isWalkable(grid, movingTo)) {
      syncStatusMessage(null);
      return;
    }

    if (
      !nextStep &&
      backtrackStep &&
      sameCell(backtrackStep, movingTo) &&
      isWalkable(grid, movingTo)
    ) {
      syncStatusMessage(null);
      return;
    }

    stopAtCell(
      findRerouteAnchor(
        grid,
        currentCell,
        movingTo,
        endCell,
        mousePositionRef.current,
        cellSize
      )
    );
  }, [cellSize, currentCell, endCell, grid, isAnimationEnabled, movingTo, route]);

  useEffect(() => {
    if (!isAnimationEnabled || movingTo || sameCell(currentCell, endCell)) {
      return;
    }

    const backtrackStep = getBacktrackStep(trailRef.current, grid);
    const nextStep = route[1] ?? backtrackStep;

    if (!nextStep) {
      syncStatusMessage(NO_ROUTE_MESSAGE);
      return;
    }

    syncStatusMessage(null);
    startStep(currentCell, nextStep);
  }, [currentCell, endCell, grid, isAnimationEnabled, movingTo, route]);

  const hasArrived = sameCell(currentCell, endCell);

  const activeHeading = direction;
  const normalX = -activeHeading.dy;
  const normalY = activeHeading.dx;
  const headX = mousePosition.x + activeHeading.dx * robotRadius * 0.52;
  const headY = mousePosition.y + activeHeading.dy * robotRadius * 0.52;
  const earOffset = robotRadius * 0.5;
  const leftEarX = headX - activeHeading.dx * robotRadius * 0.16 + normalX * earOffset;
  const leftEarY = headY - activeHeading.dy * robotRadius * 0.16 + normalY * earOffset;
  const rightEarX = headX - activeHeading.dx * robotRadius * 0.16 - normalX * earOffset;
  const rightEarY = headY - activeHeading.dy * robotRadius * 0.16 - normalY * earOffset;
  const eyeX = headX + activeHeading.dx * robotRadius * 0.3 + normalX * robotRadius * 0.13;
  const eyeY = headY + activeHeading.dy * robotRadius * 0.3 + normalY * robotRadius * 0.13;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "0", // Removed padding to allow the maze to take up more space as requested
        width: "100%",
        height: "100%",
      }}
    >
      {interactive && statusMessage ? (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-20 flex w-full -translate-x-1/2 justify-center px-3 sm:-top-7">
          <div className="max-w-[calc(100%-1.5rem)] rounded-full border border-rose-400/40 bg-rose-950/70 px-4 py-2 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-rose-100 shadow-[0_0_1.5rem_rgba(251,113,133,0.14)] backdrop-blur-sm sm:text-xs">
            {statusMessage}
          </div>
        </div>
      ) : null}

      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          aspectRatio: "1 / 1",
          position: "relative",
          display: "flex", // Centering SVG inside its own wrapper
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="relative z-10 block"
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            flexShrink: 0,
          }}
        >
          <defs>
            <filter id={wallGlowId} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id={robotGlowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <radialGradient id={robotGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="50%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#818CF8" />
            </radialGradient>

            <clipPath id={passageClipId}>
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) =>
                  cell === 0 ? (
                    <rect
                      key={`pc-${rowIndex}-${colIndex}`}
                      x={colIndex * cellSize}
                      y={rowIndex * cellSize}
                      width={cellSize}
                      height={cellSize}
                    />
                  ) : null
                )
              )}
            </clipPath>
          </defs>

          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              return (
                <rect
                  key={`g-${rowIndex}-${colIndex}`}
                  x={colIndex * cellSize}
                  y={rowIndex * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={cell === 1 ? "#0F1730" : "#050915"}
                  stroke={cell === 1 ? "#1B2440" : "#11182D"}
                  strokeWidth={cell === 1 ? "0.5" : "0.2"}
                  pointerEvents="none"
                />
              );
            })
          )}

          {interactive
            ? grid.map((row, rowIndex) =>
                row.map((_, colIndex) => {
                  const mazeCell: Cell = [rowIndex, colIndex];

                  return (
                    <rect
                      key={`hit-${rowIndex}-${colIndex}`}
                      x={colIndex * cellSize}
                      y={rowIndex * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill="transparent"
                      pointerEvents="all"
                      onClick={() => handleCellToggle(rowIndex, colIndex)}
                      style={{
                        cursor: sameCell(mazeCell, currentCell) ? "default" : "pointer",
                      }}
                    />
                  );
                })
              )
            : null}

          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              if (cell !== 1) {
                return null;
              }

              const segments: React.JSX.Element[] = [];

              if (rowIndex > 0 && grid[rowIndex - 1][colIndex] === 0) {
                segments.push(
                  <line
                    key={`et-${rowIndex}-${colIndex}`}
                    x1={colIndex * cellSize}
                    y1={rowIndex * cellSize}
                    x2={(colIndex + 1) * cellSize}
                    y2={rowIndex * cellSize}
                    stroke="#A855F7"
                    strokeWidth="1.5"
                    filter={`url(#${wallGlowId})`}
                    pointerEvents="none"
                  />
                );
              }

              if (rowIndex < GRID_ROWS - 1 && grid[rowIndex + 1][colIndex] === 0) {
                segments.push(
                  <line
                    key={`eb-${rowIndex}-${colIndex}`}
                    x1={colIndex * cellSize}
                    y1={(rowIndex + 1) * cellSize}
                    x2={(colIndex + 1) * cellSize}
                    y2={(rowIndex + 1) * cellSize}
                    stroke="#A855F7"
                    strokeWidth="1.5"
                    filter={`url(#${wallGlowId})`}
                    pointerEvents="none"
                  />
                );
              }

              if (colIndex > 0 && grid[rowIndex][colIndex - 1] === 0) {
                segments.push(
                  <line
                    key={`el-${rowIndex}-${colIndex}`}
                    x1={colIndex * cellSize}
                    y1={rowIndex * cellSize}
                    x2={colIndex * cellSize}
                    y2={(rowIndex + 1) * cellSize}
                    stroke="#A855F7"
                    strokeWidth="1.5"
                    filter={`url(#${wallGlowId})`}
                    pointerEvents="none"
                  />
                );
              }

              if (colIndex < GRID_COLS - 1 && grid[rowIndex][colIndex + 1] === 0) {
                segments.push(
                  <line
                    key={`er-${rowIndex}-${colIndex}`}
                    x1={(colIndex + 1) * cellSize}
                    y1={rowIndex * cellSize}
                    x2={(colIndex + 1) * cellSize}
                    y2={(rowIndex + 1) * cellSize}
                    stroke="#A855F7"
                    strokeWidth="1.5"
                    filter={`url(#${wallGlowId})`}
                    pointerEvents="none"
                  />
                );
              }

              return segments;
            })
          )}

          {route.length > 1 ? (
            <polyline
              points={route
                .map(([row, col]) => cellCenter(row, col, cellSize))
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              fill="none"
              stroke="#818CF8"
              strokeWidth="1"
              opacity="0.12"
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
          ) : null}

          {[
            { id: "start-cell", point: startCell, label: "S", fill: "#A855F7", text: "#C084FC" },
            { id: "end-cell", point: endCell, label: "E", fill: "#818CF8", text: "#E2E8F0" },
          ].map(({ id, point, label, fill, text }) => {
            const markerX = point[1] * cellSize + cellSize * 0.12;
            const markerY = point[0] * cellSize + cellSize * 0.12;
            const markerCenterX = point[1] * cellSize + cellSize / 2;
            const markerCenterY = point[0] * cellSize + cellSize / 2;
            const isGoal = sameCell(point, endCell);

            return (
              <React.Fragment key={id}>
                <rect
                  x={markerX}
                  y={markerY}
                  width={cellSize * 0.76}
                  height={cellSize * 0.76}
                  rx={3}
                  fill={fill}
                  opacity={isGoal && hasArrived ? 0.34 : 0.24}
                  pointerEvents="none"
                />
                <text
                  x={markerCenterX}
                  y={markerCenterY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(7, cellSize * 0.38)}
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill={text}
                  pointerEvents="none"
                >
                  {label}
                </text>
              </React.Fragment>
            );
          })}

          <g clipPath={`url(#${passageClipId})`} pointerEvents="none">
            <circle
              cx={mousePosition.x}
              cy={mousePosition.y}
              r={robotRadius * 1.02}
              fill={`url(#${robotGradId})`}
              filter={`url(#${robotGlowId})`}
            />

            <line
              x1={mousePosition.x}
              y1={mousePosition.y}
              x2={headX}
              y2={headY}
              stroke="#E9D5FF"
              strokeWidth={Math.max(0.75, robotRadius * 0.24)}
              strokeLinecap="round"
              opacity="0.9"
            />

            <circle cx={headX} cy={headY} r={robotRadius * 0.7} fill="#F4ECFF" opacity="0.92" />
            <circle cx={leftEarX} cy={leftEarY} r={robotRadius * 0.34} fill="#D8B4FE" opacity="0.9" />
            <circle cx={rightEarX} cy={rightEarY} r={robotRadius * 0.34} fill="#D8B4FE" opacity="0.9" />
            <circle cx={eyeX} cy={eyeY} r={robotRadius * 0.11} fill="#111827" opacity="0.9" />
          </g>
        </svg>
      </div>
    </div>
  );
}
