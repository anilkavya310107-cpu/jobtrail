import test from "node:test";
import assert from "node:assert/strict";
import { canTransition } from "../src/services/stateMachine.js";
import { baselineMatch, extractSkills, validateLLMResult, parseJSONFromText } from "../src/services/matcher.js";

test("state machine allows valid and blocks invalid transitions", () => {
  assert.equal(canTransition("wishlist", "applied"), true);
  assert.equal(canTransition("wishlist", "offer"), false);
  assert.equal(canTransition("rejected", "applied"), true);
  assert.equal(canTransition("accepted", "applied"), false);
});

test("skill extraction handles symbols and aliases", () => {
  const skills = extractSkills("Built apps with Node.js, C++ and React.js using MongoDB");
  for (const s of ["Node.js", "C++", "React", "MongoDB"]) assert.ok(skills.includes(s), s);
  assert.ok(!extractSkills("javascripty").includes("JavaScript"));
});

test("baseline score reflects skill overlap", () => {
  const r = baselineMatch("I know React, Node.js and MongoDB", "Need React, Node.js, MongoDB and Docker");
  assert.equal(r.score, 75);
  assert.deepEqual(r.missing, ["Docker"]);
});

test("LLM output is validated", () => {
  const ok = validateLLMResult({ fitScore: 71.4, summary: "Good fit.", strengths: ["a"], missingSkills: [], suggestions: [] });
  assert.equal(ok.fitScore, 71);
  assert.throws(() => validateLLMResult({ fitScore: 400, summary: "x" }));
  assert.throws(() => validateLLMResult({ fitScore: 50 }));
  assert.throws(() => parseJSONFromText("no json here"));
  assert.equal(parseJSONFromText('Sure! {"a":1} done').a, 1);
});
