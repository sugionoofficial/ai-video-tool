"use strict";

/*
 * GEN-Z.AI Provider Registry
 *
 * File ini hanya menyimpan metadata provider.
 * API key TIDAK BOLEH disimpan di browser.
 */

window.GENZProviderRegistry = (() => {
  const builtIn = {
    gemini: {
      id: "veo",
      displayName: "Gemini",
      active: true,
      managed: true
    },

    minimax: {
      id: "minimax",
      displayName: "MiniMax",
      active: true,
      managed: true
    },

    luma: {
      id: "luma",
      displayName: "Luma",
      active: true,
      managed: true
    }
  };

  function normalize(provider) {
    return String(provider || "")
      .trim()
      .toLowerCase();
  }

  function canonicalId(provider) {
    const id = normalize(provider);

    if (id === "gemini") {
      return "veo";
    }

    return id;
  }

  function isBuiltIn(provider) {
    const id = normalize(provider);

    return (
      id === "gemini" ||
      id === "veo" ||
      id === "minimax" ||
      id === "luma"
    );
  }

  function get(provider) {
    const id = normalize(provider);

    if (id === "gemini" || id === "veo") {
      return builtIn.gemini;
    }

    if (id === "minimax") {
      return builtIn.minimax;
    }

    if (id === "luma") {
      return builtIn.luma;
    }

    return null;
  }

  function getActiveBuiltIns() {
    return Object.values(builtIn).filter(provider => provider.active);
  }

  return {
    builtIn,
    normalize,
    canonicalId,
    isBuiltIn,
    get,
    getActiveBuiltIns
  };
})();
