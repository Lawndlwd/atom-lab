import { useEffect, useMemo, useState } from "react";
import { trpc } from "../../trpc";
import { REVIEW_QUESTIONS } from "../../../shared/constants";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback";
import { IconCheck, IconArrow } from "../../components/icons";

type Key = (typeof REVIEW_QUESTIONS)[number]["key"];

export default function Review() {
  const current = trpc.review.current.useQuery(undefined, { staleTime: 10_000 });
  const util = trpc.useUtils();
  const [step, setStep] = useState(0);

  const answers: Record<string, string> = useMemo(() => {
    if (!current.data?.review) return {};
    try {
      return JSON.parse(current.data.review.answers);
    } catch {
      return {};
    }
  }, [current.data?.review?.answers]);

  const locked = !!current.data?.review?.completedAt;
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => setDraft(answers), [answers]);

  const setAnswer = trpc.review.setAnswer.useMutation({
    onSuccess: () => {
      util.review.current.invalidate();
    },
  });
  const complete = trpc.review.complete.useMutation({
    onSuccess: () => {
      util.review.current.invalidate();
    },
  });

  const saveSoon = useDebouncedCallback((key: Key, text: string) => {
    if (!current.data) return;
    setAnswer.mutate({
      year: current.data.year,
      weekNumber: current.data.weekNumber,
      key,
      text,
    });
  }, 500);

  function onChange(key: Key, text: string) {
    setDraft((d) => ({ ...d, [key]: text }));
    saveSoon(key, text);
  }

  const progress = REVIEW_QUESTIONS.filter((q) => (draft[q.key] ?? "").trim().length > 0).length;
  const total = REVIEW_QUESTIONS.length;
  const curQ = REVIEW_QUESTIONS[step];

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 max-w-[1120px]">
      <header className="flex items-end justify-between gap-6 flex-wrap mb-6">
        <div>
          <div className="eyebrow">Sunday review · Week {current.data?.weekNumber ?? "—"}</div>
          <h1 className="title-lg mt-2">Five questions. One at a time.</h1>
        </div>
        <div className="flex gap-1.5 items-center">
          {REVIEW_QUESTIONS.map((q, i) => (
            <div
              key={q.key}
              style={{
                width: 22,
                height: 3,
                borderRadius: 2,
                background: (draft[q.key] ?? "").trim()
                  ? "var(--teal)"
                  : i === step
                    ? "var(--ink)"
                    : "var(--bg-2)",
              }}
            />
          ))}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:flex flex-col gap-1">
          {REVIEW_QUESTIONS.map((q, i) => {
            const filled = (draft[q.key] ?? "").trim().length > 0;
            const isCur = i === step;
            return (
              <button
                key={q.key}
                type="button"
                onClick={() => setStep(i)}
                className="flex gap-3 text-left py-3"
                style={{
                  borderBottom: "0.5px dashed var(--line)",
                  color: isCur ? "var(--ink)" : filled ? "var(--ink-2)" : "var(--ink-3)",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    marginTop: 2,
                    background: filled ? "var(--teal)" : isCur ? "var(--teal-soft)" : "transparent",
                    border:
                      "1px solid " +
                      (filled ? "var(--teal)" : isCur ? "var(--teal)" : "var(--ink-4)"),
                    flexShrink: 0,
                  }}
                >
                  {filled && <IconCheck size={10} />}
                </span>
                <span style={{ fontSize: 12, lineHeight: 1.4, fontWeight: isCur ? 500 : 400 }}>
                  {q.q}
                </span>
              </button>
            );
          })}
        </aside>

        <main>
          <div className="eyebrow">
            Question {step + 1} of {total}
          </div>
          <h2 className="title-md mt-3" style={{ fontSize: 26 }}>
            {curQ.q}
          </h2>
          <p className="body-sm mt-2" style={{ fontStyle: "italic" }}>
            {curQ.hint}
          </p>

          <textarea
            className="textarea mt-5"
            placeholder="Type your answer…"
            value={draft[curQ.key] ?? ""}
            onChange={(e) => onChange(curQ.key, e.target.value)}
            disabled={locked}
            rows={6}
          />
          {!(draft[curQ.key] ?? "").trim() && !locked && (
            <div className="body-sm mt-1" style={{ color: "var(--ink-3)" }}>
              <span className="caret" /> waiting
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <IconArrow dir="l" /> Back
            </button>
            <div className="flex gap-2">
              {step < total - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                >
                  Next <IconArrow />
                </button>
              ) : (
                <>
                  {!locked && progress < total && (
                    <span className="body-sm" style={{ color: "var(--ink-3)" }}>
                      {progress}/{total} answered
                    </span>
                  )}
                  {!locked && (
                    <button
                      className="btn btn-primary"
                      disabled={progress < total || complete.isPending}
                      onClick={() =>
                        current.data &&
                        complete.mutate({
                          year: current.data.year,
                          weekNumber: current.data.weekNumber,
                        })
                      }
                    >
                      {complete.isPending ? "Locking…" : "Complete"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {locked && (
            <div
              className="card mt-6"
              style={{ background: "var(--teal-soft)", borderColor: "rgba(124,181,165,0.3)" }}
            >
              <div className="eyebrow eyebrow-teal">Done for this week</div>
              <p className="body-sm mt-2">
                Locked. Your answers are safe; see history in Settings.
              </p>
            </div>
          )}

          {setAnswer.isPending ? (
            <div className="body-sm mt-3" style={{ color: "var(--ink-3)" }}>
              Saving…
            </div>
          ) : setAnswer.data ? (
            <div className="body-sm mt-3" style={{ color: "var(--ink-3)" }}>
              Saved.
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
