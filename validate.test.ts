import assert from "node:assert/strict";
import test from "node:test";
import { classifyAnswer, letterOk, scoreRound } from "./validate.ts";

test("letter matching treats accents as the base letter", () => {
  assert.equal(letterOk("México", "M"), true);
  assert.equal(letterOk("Évora", "E"), true);
  assert.equal(letterOk("Portugal", "M"), false);
});

test("animal + matching letter is valid", () => {
  const r = classifyAnswer({ id: "animal", label: "Animal" }, "Macaco", "M");
  assert.equal(r.status, "valid");
});

test("wrong category is not auto-valid", () => {
  const r = classifyAnswer({ id: "animal", label: "Animal" }, "México", "M");
  assert.equal(r.status, "vote");
});

test("wrong letter is invalid even if the word fits the category", () => {
  const r = classifyAnswer({ id: "pais", label: "País" }, "Portugal", "M");
  assert.equal(r.status, "invalid");
});

test("empty answers score zero", () => {
  const scored = scoreRound({
    categories: [{ id: "animal", label: "Animal" }],
    letter: "M",
    duplicatePoints: 5,
    answersByUser: {
      a: { animal: "Macaco" },
      b: { animal: "" },
    },
  });
  const empty = scored.find((s) => s.userId === "b");
  assert.equal(empty?.points, 0);
  assert.equal(empty?.status, "empty");
});

test("duplicate valid answers share points", () => {
  const scored = scoreRound({
    categories: [{ id: "animal", label: "Animal" }],
    letter: "M",
    duplicatePoints: 5,
    answersByUser: {
      a: { animal: "Macaco" },
      b: { animal: "macaco" },
    },
  });
  assert.equal(scored.every((s) => s.status === "duplicate"), true);
  assert.equal(scored.every((s) => s.points === 5), true);
});
