// ============================================================
// GEN-Z.AI
// CHINAAPI MODEL REGISTRY
// ============================================================

import "./agnes-video-2-5-flash.js";
import "./doubao-seedance-2-0-mini-260615.js";


const MODELS =
  Object.create(null);


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


function loadBuiltInModels() {

  const globalObject =
    typeof globalThis !== "undefined"
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


loadBuiltInModels();


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


function hasModel(
  modelId
) {

  return Boolean(
    getModel(
      modelId
    )
  );

}


function listModels() {

  return Object.keys(
    MODELS
  );

}


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


  let info =
    null;


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


function getModelsInfo() {

  return listModels()
    .map(
      modelId =>
        getModelInfo(
          modelId
        )
    );

}


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
    // fallback
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


function buildPayload(
  modelId,
  options = {}
) {

  const selectedModelId =
    String(
      modelId || ""
    ).trim();


  if (!selectedModelId) {

    throw new Error(
      "Model ChinaAPI tidak boleh kosong."
    );

  }


  const model =
    resolveModel(
      selectedModelId
    );


  if (
    typeof model.buildPayload !==
    "function"
  ) {

    throw new Error(
      `Model "${selectedModelId}" belum memiliki payload builder.`
    );

  }


  const payload =
    model.buildPayload(
      {
        ...options,

        model:
          selectedModelId
      }
    );


  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(payload)
  ) {

    throw new Error(
      `Payload model "${selectedModelId}" tidak valid.`
    );

  }


  /*
   * PENTING
   *
   * Jangan mempercayakan field model hanya kepada
   * masing-masing model builder.
   *
   * Beberapa model/provider dapat mengembalikan
   * payload tanpa field model.
   *
   * ChinaAPI membutuhkan:
   *
   * {
   *   "model": "nama-model"
   * }
   *
   * Karena modelId sudah divalidasi melalui registry,
   * selalu paksa model yang dipilih masuk ke payload.
   */

  payload.model =
    selectedModelId;


  /*
   * Normalisasi prompt jika tersedia.
   */

  if (
    options.prompt !==
      undefined &&
    payload.prompt ===
      undefined
  ) {

    payload.prompt =
      String(
        options.prompt || ""
      ).trim();

  }


  /*
   * Pastikan model tidak pernah kosong
   * setelah proses builder.
   */

  if (
    !String(
      payload.model || ""
    ).trim()
  ) {

    payload.model =
      selectedModelId;

  }


  return payload;

}


function registerExternalModel(
  model
) {

  return registerModel(
    model
  );

}


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


function getRegistry() {

  return Object.freeze({

    ...MODELS

  });

}


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


if (
  typeof globalThis !==
  "undefined"
) {

  globalThis.GENZ_CHINAAPI_MODELS =
    ChinaApiModels;

}


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
