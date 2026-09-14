// ============================================================
// GEN-Z.AI
// CHINAAPI MODEL REGISTRY
// ============================================================
//
// Registry khusus model ChinaAPI.
//
// Struktur:
//
// public/js/providers/chinaapi/
// ├── index.js
// ├── agnes-video-2-5-flash.js
// └── doubao-seedance-2-0-mini-260615.js
//
// File ini TIDAK menggantikan adapter utama ChinaAPI.
// Adapter utama tetap:
// public/js/providers/chinaapi.js
//
// Registry ini hanya mengatur model-model ChinaAPI.
// ============================================================


// ============================================================
// LOAD MODEL CONFIG
// ============================================================
//
// Import sebagai side-effect.
//
// File model mendaftarkan konfigurasi ke globalThis.
// Cara ini dibuat agar tetap kompatibel dengan:
//
// - Browser
// - Cloudflare/server runtime
// - Node ESM
// - sistem adapter lama GEN-Z.AI
//
// ============================================================

import "./agnes-video-2-5-flash.js";

import "./doubao-seedance-2-0-mini-260615.js";


// ============================================================
// INTERNAL STORAGE
// ============================================================

const MODELS =
  Object.create(null);


// ============================================================
// NORMALIZE MODEL ID
// ============================================================

function normalizeModelId(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }

  return String(value)
    .trim()
    .toLowerCase();

}


// ============================================================
// REGISTER MODEL
// ============================================================

function registerModel(
  model
) {

  if (
    !model ||
    typeof model !== "object"
  ) {

    return null;

  }

  const id =
    normalizeModelId(
      model.id
    );

  if (!id) {

    return null;

  }

  MODELS[id] =
    model;

  return model;

}


// ============================================================
// LOAD BUILT-IN MODELS
// ============================================================

function loadBuiltInModels() {

  const globalObject =
    typeof globalThis !==
    "undefined"
      ? globalThis
      : null;


  if (!globalObject) {

    return;

  }


  registerModel(
    globalObject
      .GENZ_CHINAAPI_AGNES_VIDEO_25
  );


  registerModel(
    globalObject
      .GENZ_CHINAAPI_DOUBAO_SEEDANCE_20_MINI
  );

}


// ============================================================
// INITIALIZE
// ============================================================

loadBuiltInModels();


// ============================================================
// GET MODEL
// ============================================================

function getModel(
  modelId
) {

  const id =
    normalizeModelId(
      modelId
    );

  if (!id) {

    return null;

  }

  return (
    MODELS[id] ||
    null
  );

}


// ============================================================
// RESOLVE MODEL
// ============================================================

function resolveModel(
  modelId
) {

  const model =
    getModel(
      modelId
    );


  if (!model) {

    throw new Error(
      `Model ChinaAPI "${String(
        modelId || ""
      )}" belum tersedia.`
    );

  }


  return model;

}


// ============================================================
// MODEL EXISTS
// ============================================================

function hasModel(
  modelId
) {

  return Boolean(
    getModel(
      modelId
    )
  );

}


// ============================================================
// LIST MODEL IDS
// ============================================================

function listModels() {

  return Object.keys(
    MODELS
  );

}


// ============================================================
// LIST ACTIVE MODELS
// ============================================================

function listActiveModels() {

  return Object.keys(
    MODELS
  ).filter(
    modelId => {

      const model =
        MODELS[modelId];

      return (
        model &&
        model.active !== false
      );

    }
  );

}


// ============================================================
// GET MODEL INFO
// ============================================================

function getModelInfo(
  modelId
) {

  const model =
    getModel(
      modelId
    );


  if (!model) {

    return {

      id:
        normalizeModelId(
          modelId
        ),

      name:
        String(
          modelId || ""
        ),

      provider:
        "chinaapi",

      supported:
        false,

      active:
        false,

      capabilities:
        {},

      credits:
        null

    };

  }


  let info = null;


  try {

    if (
      typeof model.info ===
      "function"
    ) {

      info =
        model.info();

    }

  } catch {

    info =
      null;

  }


  return {

    id:
      model.id,

    name:
      model.name,

    provider:
      model.provider ||
      "chinaapi",

    supported:
      true,

    active:
      model.active !== false,

    capabilities:
      model.capabilities ||
      {},

    credits:
      model.credits ||
      model.capabilities?.credits ||
      null,

    info:
      info || null

  };

}


// ============================================================
// GET ALL MODEL INFO
// ============================================================

function getModelsInfo() {

  return listModels()
    .map(
      modelId =>
        getModelInfo(
          modelId
        )
    );

}


// ============================================================
// GET CAPABILITIES
// ============================================================

function getCapabilities(
  modelId
) {

  const model =
    getModel(
      modelId
    );


  if (!model) {

    return {};

  }


  return (
    model.capabilities ||
    {}
  );

}


// ============================================================
// GET CREDITS
// ============================================================

function getCredits(
  modelId,
  options = {}
) {

  const model =
    getModel(
      modelId
    );


  if (!model) {

    return 0;

  }


  try {

    if (
      typeof model.calculateCredits ===
      "function"
    ) {

      const value =
        Number(
          model.calculateCredits(
            options
          )
        );


      if (
        Number.isFinite(
          value
        ) &&
        value > 0
      ) {

        return value;

      }

    }


    if (
      typeof model.getCredits ===
      "function"
    ) {

      const value =
        Number(
          model.getCredits(
            options
          )
        );


      if (
        Number.isFinite(
          value
        ) &&
        value > 0
      ) {

        return value;

      }

    }

  } catch {

    // Fallback di bawah.

  }


  const defaultCredit =
    Number(
      model.capabilities
        ?.credits
        ?.default
    );


  if (
    Number.isFinite(
      defaultCredit
    ) &&
    defaultCredit > 0
  ) {

    return defaultCredit;

  }


  return 0;

}


// ============================================================
// VALIDATE MODEL
// ============================================================

function validateModel(
  modelId,
  options = {}
) {

  const model =
    getModel(
      modelId
    );


  if (!model) {

    return {

      valid:
        false,

      errors: [
        `Model ChinaAPI "${String(
          modelId || ""
        )}" belum tersedia.`
      ]

    };

  }


  if (
    typeof model.validate !==
    "function"
  ) {

    return {

      valid:
        true,

      errors: []

    };

  }


  try {

    return model.validate(
      options
    );

  } catch (error) {

    return {

      valid:
        false,

      errors: [
        String(
          error?.message ||
          error ||
          "Model tidak valid."
        )
      ]

    };

  }

}


// ============================================================
// BUILD PAYLOAD
// ============================================================

function buildPayload(
  modelId,
  options = {}
) {

  const model =
    resolveModel(
      modelId
    );


  if (
    typeof model.buildPayload !==
    "function"
  ) {

    throw new Error(
      `Model "${modelId}" belum memiliki payload builder.`
    );

  }


  return model.buildPayload(
    options
  );

}


// ============================================================
// REGISTER EXTERNAL MODEL
// ============================================================
//
// Admin/provider nantinya dapat memakai fungsi ini
// untuk menambahkan model baru tanpa mengubah registry utama.
//
// ============================================================

function registerExternalModel(
  model
) {

  return registerModel(
    model
  );

}


// ============================================================
// REMOVE MODEL
// ============================================================

function unregisterModel(
  modelId
) {

  const id =
    normalizeModelId(
      modelId
    );


  if (!id) {

    return false;

  }


  if (
    !Object.prototype.hasOwnProperty.call(
      MODELS,
      id
    )
  ) {

    return false;

  }


  delete MODELS[id];

  return true;

}


// ============================================================
// GET REGISTRY
// ============================================================

function getRegistry() {

  return Object.freeze({

    ...MODELS

  });

}


// ============================================================
// PUBLIC API
// ============================================================

const ChinaApiModels = {

  getModel,

  resolveModel,

  hasModel,

  listModels,

  listActiveModels,

  getModelInfo,

  getModelsInfo,

  getCapabilities,

  getCredits,

  validateModel,

  buildPayload,

  registerModel:

    registerExternalModel,

  unregisterModel,

  getRegistry

};


// ============================================================
// BROWSER BRIDGE
// ============================================================

if (
  typeof globalThis !==
  "undefined"
) {

  globalThis.GENZ_CHINAAPI_MODELS =
    ChinaApiModels;

}


// ============================================================
// EXPORTS
// ============================================================

export {

  MODELS,

  normalizeModelId,

  registerModel,

  getModel,

  resolveModel,

  hasModel,

  listModels,

  listActiveModels,

  getModelInfo,

  getModelsInfo,

  getCapabilities,

  getCredits,

  validateModel,

  buildPayload,

  unregisterModel,

  getRegistry

};


export default
  ChinaApiModels;
