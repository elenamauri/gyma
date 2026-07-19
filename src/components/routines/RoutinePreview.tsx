"use client";

import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ExerciseIndexEntry,
  Routine,
  RoutineExerciseReps,
  RoutineExerciseTimed,
} from "@/lib/types";
import { Mono } from "@/components/ui/primitives";
import { MuscleMap } from "@/components/exercises/MuscleMap";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";

export function useRoutineStats(
  routine: Pick<Routine, "type" | "exercises"> | null | undefined,
  catalog: ExerciseIndexEntry[],
) {
  return useMemo(() => {
    if (!routine) {
      return {
        sets: 0,
        durationMin: 0,
        primary: [] as string[],
        secondary: [] as string[],
      };
    }
    if (routine.type === "reps") {
      const list = routine.exercises as RoutineExerciseReps[];
      const sets = list.reduce((s, e) => s + e.sets, 0);
      const durationMin = Math.round(
        list.reduce((s, e) => s + e.sets * (45 + e.restSeconds), 0) / 60,
      );
      const primary: string[] = [];
      const secondary: string[] = [];
      for (const ex of list) {
        const cat = catalog.find((c) => c.id === ex.exerciseId);
        if (!cat) continue;
        primary.push(...cat.primaryMuscles);
        secondary.push(...cat.secondaryMuscles);
      }
      return { sets, durationMin, primary, secondary };
    }
    const list = routine.exercises as RoutineExerciseTimed[];
    const durationMin = Math.round(
      list.reduce((s, e) => s + e.durationSeconds + e.restSeconds, 0) / 60,
    );
    const primary: string[] = [];
    const secondary: string[] = [];
    for (const ex of list) {
      const cat = catalog.find((c) => c.id === ex.exerciseId);
      if (!cat) continue;
      primary.push(...cat.primaryMuscles);
      secondary.push(...cat.secondaryMuscles);
    }
    return { sets: list.length, durationMin, primary, secondary };
  }, [routine, catalog]);
}

function formatDurationMin(min: number) {
  if (min < 60) return `~${min}m`;
  return `~${Math.floor(min / 60)}h ${min % 60}m`;
}

export function RoutineAccordion({
  name,
  subtitle,
  stats,
  defaultOpen = false,
}: {
  name: string;
  subtitle?: string;
  stats: {
    sets: number;
    durationMin: number;
    primary: string[];
    secondary: string[];
  };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left touch-manipulation"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {name}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={`mt-2 text-xl text-muted transition-transform ${
            open ? "rotate-0" : "-rotate-90"
          }`}
          aria-hidden
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-3 items-center gap-2 border border-hairline px-3 py-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Set
            </div>
            <Mono className="text-2xl">{stats.sets}</Mono>
          </div>
          <div className="border-x border-hairline text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Durata
            </div>
            <Mono className="text-lg">
              {formatDurationMin(stats.durationMin)}
            </Mono>
          </div>
          <div className="flex h-16 items-center justify-center overflow-hidden">
            <MuscleMap
              compact
              primaryMuscles={[...new Set(stats.primary)]}
              secondaryMuscles={[...new Set(stats.secondary)]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function RoutineExerciseList({
  type,
  exercises,
  catalog,
  editingId,
  onSelect,
  onChangeReps,
  onChangeTimed,
  onRemove,
  onReplace,
  onReorder,
  weightUnit = "kg",
}: {
  type: Routine["type"];
  exercises: Routine["exercises"];
  catalog: ExerciseIndexEntry[];
  editingId?: string | null;
  onSelect?: (exerciseId: string) => void;
  onChangeReps?: (id: string, patch: Partial<RoutineExerciseReps>) => void;
  onChangeTimed?: (id: string, patch: Partial<RoutineExerciseTimed>) => void;
  onRemove?: (id: string) => void;
  onReplace?: (id: string) => void;
  onReorder?: (activeId: string, overId: string) => void;
  weightUnit?: "kg" | "lb";
}) {
  const ids = exercises.map((e) => e.id);
  const sortable = !!onReorder;
  const [menuId, setMenuId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !onReorder || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  const rows =
    type === "reps"
      ? (exercises as RoutineExerciseReps[]).map((ex) => {
          const body = (dragHandle: ReactNode | null) => (
            <RepsRow
              ex={ex}
              cat={catalog.find((c) => c.id === ex.exerciseId)}
              open={editingId === ex.id}
              menuOpen={menuId === ex.id}
              onToggleMenu={() =>
                setMenuId((id) => (id === ex.id ? null : ex.id))
              }
              onSelect={onSelect}
              onChangeReps={onChangeReps}
              onRemove={onRemove}
              onReplace={onReplace}
              weightUnit={weightUnit}
              dragHandle={dragHandle}
            />
          );
          return sortable ? (
            <SortableRow key={ex.id} id={ex.id}>
              {body}
            </SortableRow>
          ) : (
            <li key={ex.id} className="overflow-hidden py-0">
              {body(null)}
            </li>
          );
        })
      : (exercises as RoutineExerciseTimed[]).map((ex) => {
          const body = (dragHandle: ReactNode | null) => (
            <TimedRow
              ex={ex}
              cat={catalog.find((c) => c.id === ex.exerciseId)}
              open={editingId === ex.id}
              menuOpen={menuId === ex.id}
              onToggleMenu={() =>
                setMenuId((id) => (id === ex.id ? null : ex.id))
              }
              onSelect={onSelect}
              onChangeTimed={onChangeTimed}
              onRemove={onRemove}
              onReplace={onReplace}
              dragHandle={dragHandle}
            />
          );
          return sortable ? (
            <SortableRow key={ex.id} id={ex.id}>
              {body}
            </SortableRow>
          ) : (
            <li key={ex.id} className="overflow-hidden py-0">
              {body(null)}
            </li>
          );
        });

  if (!sortable) {
    return <ul className="divide-y divide-hairline">{rows}</ul>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-hairline">{rows}</ul>
      </SortableContext>
    </DndContext>
  );
}

export function reorderByIds<T extends { id: string }>(
  list: T[],
  activeId: string,
  overId: string,
): T[] {
  const oldIndex = list.findIndex((e) => e.id === activeId);
  const newIndex = list.findIndex((e) => e.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return list;
  return arrayMove(list, oldIndex, newIndex);
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode | null) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.92 : undefined,
    background: isDragging ? "#FAFAF8" : undefined,
  };

  const dragHandle = (
    <button
      type="button"
      className="flex h-11 w-8 shrink-0 cursor-grab items-center justify-center text-muted touch-manipulation active:cursor-grabbing"
      aria-label="Trascina per riordinare"
      {...attributes}
      {...listeners}
    >
      <DragHandleIcon />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden ${isDragging ? "shadow-sm" : ""}`}
    >
      {children(dragHandle)}
    </li>
  );
}

function DragHandleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

/** Horizontal swipe reveals delete. */
function SwipeDelete({
  enabled,
  onDelete,
  children,
}: {
  enabled: boolean;
  onDelete?: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const dragging = useRef(false);

  if (!enabled || !onDelete) {
    return <div className="py-3">{children}</div>;
  }

  function onPointerDown(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) {
      return;
    }
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = null;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axis.current !== "h") return;
    e.preventDefault();
    setOffset(Math.min(0, Math.max(-96, dx)));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (offset < -72) {
      onDelete?.();
      setOffset(0);
    } else if (offset < -40) {
      setOffset(-80);
    } else {
      setOffset(0);
    }
    axis.current = null;
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex w-20 items-stretch">
        <button
          type="button"
          className="flex w-full items-center justify-center bg-accent text-sm font-medium text-chalk touch-manipulation"
          onClick={() => {
            setOffset(0);
            onDelete?.();
          }}
        >
          Elimina
        </button>
      </div>
      <div
        className="relative bg-chalk py-3 transition-transform duration-150"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragging.current = false;
          setOffset(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RowMenu({
  open,
  onToggle,
  onReplace,
}: {
  open: boolean;
  onToggle: () => void;
  onReplace?: () => void;
}) {
  if (!onReplace) return null;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center text-muted touch-manipulation"
        aria-label="Opzioni esercizio"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 min-w-[10rem] border border-hairline bg-chalk py-1 shadow-md">
          <button
            type="button"
            className="flex min-h-11 w-full items-center px-3 text-left text-sm touch-manipulation hover:bg-ink/[0.03]"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
              onReplace();
            }}
          >
            Sostituisci
          </button>
        </div>
      )}
    </div>
  );
}

function RepsRow({
  ex,
  cat,
  open,
  menuOpen,
  onToggleMenu,
  onSelect,
  onChangeReps,
  onRemove,
  onReplace,
  weightUnit,
  dragHandle,
}: {
  ex: RoutineExerciseReps;
  cat?: ExerciseIndexEntry;
  open: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onSelect?: (id: string) => void;
  onChangeReps?: (id: string, patch: Partial<RoutineExerciseReps>) => void;
  onRemove?: (id: string) => void;
  onReplace?: (id: string) => void;
  weightUnit: "kg" | "lb";
  dragHandle: ReactNode | null;
}) {
  return (
    <SwipeDelete enabled={!!onRemove} onDelete={() => onRemove?.(ex.id)}>
      <div className="flex w-full items-center gap-1">
        {dragHandle}
        <ExerciseThumb
          size="sm"
          exerciseId={ex.exerciseId}
          exerciseName={ex.exerciseName}
          imagePath={cat?.images[0]}
          primaryMuscles={cat?.primaryMuscles ?? []}
          secondaryMuscles={cat?.secondaryMuscles ?? []}
        />
        <button
          type="button"
          className="min-w-0 flex-1 text-left touch-manipulation"
          onClick={() => onSelect?.(ex.id)}
          disabled={!onSelect}
        >
          <div className="truncate font-medium">{ex.exerciseName}</div>
          {!open && (
            <div className="text-sm text-muted">
              {ex.sets} set · {ex.reps} rip.
              {ex.targetWeight !== undefined ? ` · ${ex.targetWeight}` : ""}
            </div>
          )}
        </button>
        <RowMenu
          open={menuOpen}
          onToggle={onToggleMenu}
          onReplace={onReplace ? () => onReplace(ex.id) : undefined}
        />
      </div>

      {open && onChangeReps && (
        <div className="mt-3 space-y-3 pl-[calc(3.5rem+0.75rem)]">
          <input
            className="w-full border-0 border-b border-hairline bg-transparent py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
            placeholder="Note…"
            value={ex.notes ?? ""}
            onChange={(e) => onChangeReps(ex.id, { notes: e.target.value })}
          />
          <div className="grid grid-cols-4 items-center gap-0 border border-hairline">
            <CompactField
              label="Set"
              value={ex.sets}
              onChange={(v) => onChangeReps(ex.id, { sets: v })}
            />
            <CompactField
              label="Rip."
              value={ex.reps}
              onChange={(v) => onChangeReps(ex.id, { reps: v })}
              className="border-l border-hairline"
            />
            <CompactField
              label={weightUnit}
              value={ex.targetWeight ?? ""}
              optional
              onChange={(v) =>
                onChangeReps(ex.id, {
                  targetWeight: v || undefined,
                })
              }
              className="border-l border-hairline"
            />
            <CompactField
              label="Rec."
              value={ex.restSeconds}
              onChange={(v) => onChangeReps(ex.id, { restSeconds: v })}
              className="border-l border-hairline"
            />
          </div>
        </div>
      )}
    </SwipeDelete>
  );
}

function TimedRow({
  ex,
  cat,
  open,
  menuOpen,
  onToggleMenu,
  onSelect,
  onChangeTimed,
  onRemove,
  onReplace,
  dragHandle,
}: {
  ex: RoutineExerciseTimed;
  cat?: ExerciseIndexEntry;
  open: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onSelect?: (id: string) => void;
  onChangeTimed?: (id: string, patch: Partial<RoutineExerciseTimed>) => void;
  onRemove?: (id: string) => void;
  onReplace?: (id: string) => void;
  dragHandle: ReactNode | null;
}) {
  return (
    <SwipeDelete enabled={!!onRemove} onDelete={() => onRemove?.(ex.id)}>
      <div className="flex w-full items-center gap-1">
        {dragHandle}
        <ExerciseThumb
          size="sm"
          exerciseId={ex.exerciseId}
          exerciseName={ex.exerciseName}
          imagePath={cat?.images[0]}
          primaryMuscles={cat?.primaryMuscles ?? []}
          secondaryMuscles={cat?.secondaryMuscles ?? []}
        />
        <button
          type="button"
          className="min-w-0 flex-1 text-left touch-manipulation"
          onClick={() => onSelect?.(ex.id)}
          disabled={!onSelect}
        >
          <div className="truncate font-medium">{ex.exerciseName}</div>
          {!open && (
            <div className="text-sm text-muted">
              {ex.durationSeconds}s · recupero {ex.restSeconds}s
            </div>
          )}
        </button>
        <RowMenu
          open={menuOpen}
          onToggle={onToggleMenu}
          onReplace={onReplace ? () => onReplace(ex.id) : undefined}
        />
      </div>

      {open && onChangeTimed && (
        <div className="mt-3 space-y-3 pl-[calc(3.5rem+0.75rem)]">
          <div className="grid grid-cols-2 items-center gap-0 border border-hairline">
            <CompactField
              label="Durata"
              value={ex.durationSeconds}
              onChange={(v) =>
                onChangeTimed(ex.id, { durationSeconds: v })
              }
            />
            <CompactField
              label="Rec."
              value={ex.restSeconds}
              onChange={(v) => onChangeTimed(ex.id, { restSeconds: v })}
              className="border-l border-hairline"
            />
          </div>
        </div>
      )}
    </SwipeDelete>
  );
}

function CompactField({
  label,
  value,
  onChange,
  optional,
  className = "",
}: {
  label: string;
  value: number | "";
  onChange: (v: number) => void;
  optional?: boolean;
  className?: string;
}) {
  return (
    <div className={`px-2 py-2.5 text-center ${className}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <input
        type="number"
        inputMode="decimal"
        min={optional ? 0 : 1}
        step="any"
        value={value}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(n);
        }}
        className="mt-0.5 w-full bg-transparent text-center font-mono text-lg outline-none focus:text-accent"
      />
    </div>
  );
}
