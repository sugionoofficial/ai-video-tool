/* =====================================================
   PROVIDER ID RESOLVER
   Provider Name = tampilan UI
   Provider ID   = nilai yang dikirim ke backend
===================================================== */

function resolveProviderId(select) {
  if (!select) return "";

  const option = select.selectedOptions?.[0];

  const providerId =
    text(option?.dataset?.providerId) ||
    text(option?.dataset?.id) ||
    text(select.dataset?.providerId) ||
    text(select.dataset?.id) ||
    text(select.value);

  return providerId.trim().toLowerCase();
}


/* =====================================================
   BUILD GENERATE REQUEST
===================================================== */

function buildGenerateBody() {
  const providerSelect = $("provider");
  const modelSelect = $("model");
  const promptInput = $("prompt");
  const ratioSelect = $("ratio");
  const durationSelect = $("duration");
  const resolutionSelect = $("resolution");

  /*
   * WAJIB menggunakan Provider ID.
   *
   * Contoh:
   * ID   : chinaapi
   * Name : ByteDance
   *
   * Request:
   * provider = "chinaapi"
   */
  const provider =
    resolveProviderId(providerSelect);

  const model =
    text(modelSelect?.value);

  const prompt =
    text(promptInput?.value);

  const ratio =
    text(ratioSelect?.value);

  const duration =
    text(durationSelect?.value);

  const resolution =
    text(resolutionSelect?.value);


  /* =========================
     VALIDATION
  ========================= */

  if (!provider) {
    throw new Error(
      "Provider belum dipilih."
    );
  }

  if (!model) {
    throw new Error(
      "Model belum dipilih."
    );
  }

  if (!prompt) {
    throw new Error(
      "Prompt wajib diisi."
    );
  }

  if (prompt.length < 3) {
    throw new Error(
      "Prompt minimal 3 karakter."
    );
  }

  if (prompt.length > 2000) {
    throw new Error(
      "Prompt maksimal 2000 karakter."
    );
  }


  /* =========================
     REQUEST BODY
  ========================= */

  const body = {
    provider: provider,
    model: model,
    prompt: prompt
  };


  if (ratio) {
    body.aspectRatio = ratio;
  }

  if (duration) {
    body.duration = duration;
  }

  if (resolution) {
    body.resolution = resolution;
  }


  /* =========================
     IMAGE INPUT
  ========================= */

  const imageData =
    getImageData();

  if (imageData) {
    body.imageData =
      imageData;
  }


  /* =========================
     DEBUG
  ========================= */

  console.log(
    "[GEN-Z.AI] Provider ID:",
    provider
  );

  console.log(
    "[GEN-Z.AI] Generate body:",
    body
  );


  return body;
}
