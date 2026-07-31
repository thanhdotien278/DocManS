import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const detailPath = new URL("../apps/web/src/components/research-proposals/proposal-detail-workspace.tsx", import.meta.url);
const apiPath = new URL("../apps/web/src/lib/research-proposals-api.ts", import.meta.url);
const listPath = new URL("../apps/web/src/components/research-proposals/research-proposals-panel.tsx", import.meta.url);

describe("Story 1.8 proposal capability UI source behavior", () => {
  it("uses the validated backend capability rather than the account role for protected proposal controls", async () => {
    const source = await readFile(detailPath, "utf8");
    assert.match(source, /getProposalCapabilityState/);
    assert.match(source, /canPerformProposalAction\(capabilityState, "proposal\.draft\.update"\)/);
    assert.match(source, /canPerformProposalAction\(capabilityState, "proposal\.decision\.approve"\)/);
    assert.match(source, /canAssignReviewers=\{canPerformProposalAction\(capabilityState, "proposal\.review\.assign"\)\}/);
    assert.match(source, /blockedReason=\{blockedProposalAction/);
    assert.doesNotMatch(source, /account\?\.systemRole/);
  });

  it("renders list relationships from the backend capability rather than a highest legacy role", async () => {
    const source = await readFile(listPath, "utf8");
    assert.match(source, /viewerAuthorization\?\.viewerRelationships/);
    assert.doesNotMatch(source, /viewerParticipation\?\.role/);
  });

  it("passes backend capability decisions into each protected sub-panel", async () => {
    for (const path of [
      new URL("../apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx", import.meta.url),
      new URL("../apps/web/src/components/research-proposals/proposal-review-form.tsx", import.meta.url),
      new URL("../apps/web/src/components/research-proposals/proposal-decision-panel.tsx", import.meta.url)
    ]) {
      const source = await readFile(path, "utf8");
      assert.match(source, /blockedReason/);
      assert.match(source, /disabled/);
    }
  });

  it("fails closed with a reload/support message for an invalid capability contract", async () => {
    const source = await readFile(apiPath, "utf8");
    assert.match(source, /isViewerAuthorizationV1\(proposal\.viewerAuthorization\)/);
    assert.match(source, /contextVersion\.domain !== "proposal"/);
    assert.match(source, /contextVersion\.recordId !== proposal\.id/);
    assert.match(source, /Không thể xác minh quyền thao tác/);
    assert.match(source, /reloadRequired: true/);
  });

  it("keeps supplement and upload controls visible with backend denial reasons", async () => {
    const source = await readFile(detailPath, "utf8");
    assert.match(source, /blockedProposalAction\(capabilityState, "proposal\.supplement\.request"\)/);
    assert.match(source, /disabled=\{!canRequestSupplement/);
    assert.match(source, /canPerformProposalAction\(capabilityState, "file\.upload"\)/);
    assert.match(source, /disabled=\{!canUpload/);
    assert.match(source, /blockedProposalAction\(capabilityState, "file\.upload"\)/);
  });
});
