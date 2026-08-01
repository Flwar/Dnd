// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { acquireBodyScrollLock } from "../../src/lib/body-scroll-lock";

describe("נעילת גלילה חופפת", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("משאירה את המסך נעול עד שכל שכבות המשחק נסגרו", () => {
    document.body.style.overflow = "auto";
    const releaseDice = acquireBodyScrollLock();
    const releaseCombat = acquireBodyScrollLock();

    expect(document.body.style.overflow).toBe("hidden");
    releaseDice();
    expect(document.body.style.overflow).toBe("hidden");

    releaseCombat();
    expect(document.body.style.overflow).toBe("auto");
    releaseCombat();
    expect(document.body.style.overflow).toBe("auto");
  });
});
