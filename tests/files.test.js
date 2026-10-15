"use strict";

const { stripJpegMetadata, stripPngMetadata } = require("../src/lib/files");
const { setup, teardown, createCondo, createUser, jpegWithExif, request } = require("./helpers");

// JPEGs reais (16x16) gerados pelo Pillow com EXIF contendo "GPSMarkerCameraXYZ".
const REAL_BASELINE = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/4QA2RXhpZgAATU0AKgAAAAgAAQEPAAIAAAATAAAAGgAAAABHUFNNYXJrZXJDYW1lcmFYWVoAAP/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIABAAEAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APOqKKK/UD6M/9k=", "base64");
const REAL_PROGRESSIVE = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/4QA2RXhpZgAATU0AKgAAAAgAAQEPAAIAAAATAAAAGgAAAABHUFNNYXJrZXJDYW1lcmFYWVoAAP/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/CABEIABAAEAMBIgACEQEDEQH/xAAVAAEBAAAAAAAAAAAAAAAAAAAABv/EABUBAQEAAAAAAAAAAAAAAAAAAAUG/9oADAMBAAIQAxAAAAGcFQj/AP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAQUCH//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEABj8CH//EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hH//aAAwDAQACAAMAAAAQ9//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Qf//EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8QH//Z", "base64");
const MARK = Buffer.from("GPSMarkerCameraXYZ");

describe("Remoção de metadados (unidade)", () => {
  test.each([
    ["baseline", REAL_BASELINE],
    ["progressivo", REAL_PROGRESSIVE],
  ])("JPEG real %s: remove EXIF e mantém a imagem", (_n, img) => {
    expect(img.includes(MARK)).toBe(true);
    const out = stripJpegMetadata(img);
    expect(out).not.toBeNull();
    expect(out.includes(MARK)).toBe(false);
    expect(out.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(out.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
  });

  test("bytes 0xFF de preenchimento antes do marcador não deixam o EXIF passar", () => {
    const img = jpegWithExif();
    const padded = Buffer.concat([img.subarray(0, 2), Buffer.from([0xff]), img.subarray(2)]);
    const out = stripJpegMetadata(padded);
    expect(out).not.toBeNull();
    expect(out.includes(Buffer.from("GPSLatitude"))).toBe(false);
  });

  test("dados anexados após o fim da imagem são descartados", () => {
    const appended = Buffer.concat([REAL_BASELINE, REAL_BASELINE]);
    const out = stripJpegMetadata(appended);
    expect(out.includes(MARK)).toBe(false);
    expect(out.length).toBeLessThan(REAL_BASELINE.length);
  });

  test("estrutura ilegível → null (falha fechada)", () => {
    expect(stripJpegMetadata(Buffer.from([0xff, 0xd8, 0x00, 0x11, 0x22]))).toBeNull();
    expect(stripJpegMetadata(REAL_BASELINE.subarray(0, 200))).toBeNull();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    expect(stripPngMetadata(png)).toBeNull();
  });
});

describe("Remoção de metadados (API)", () => {
  let app;
  let u;
  beforeAll(async () => {
    ({ app } = await setup());
    u = await createUser(app, { condo: await createCondo("Fotos") });
  });
  afterAll(teardown);

  test("imagem ilegível é recusada em vez de gravada com metadados", async () => {
    const bad = Buffer.concat([jpegWithExif().subarray(0, 30), Buffer.from([0x00, 0x00, 0x00])]);
    const res = await request(app).put("/api/me/photo").set(u.auth).attach("photo", bad, { filename: "a.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(422);
  });

  test("conta ainda sem condomínio consegue ver a própria foto", async () => {
    const solo = await createUser(app);
    const up = await request(app).put("/api/me/photo").set(solo.auth).attach("photo", REAL_BASELINE, { filename: "a.jpg", contentType: "image/jpeg" });
    expect(up.status).toBe(200);
    expect((await request(app).get(up.body.profileImageUrl).set(solo.auth)).status).toBe(200);
    expect((await request(app).get(up.body.profileImageUrl)).status).toBe(401);
  });

  test("JPEG real é aceito sem o EXIF", async () => {
    const res = await request(app).put("/api/me/photo").set(u.auth).attach("photo", REAL_PROGRESSIVE, { filename: "a.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(200);
    const file = await request(app).get(res.body.profileImageUrl).set(u.auth).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on("data", (c) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(file.status).toBe(200);
    expect(file.body.includes(MARK)).toBe(false);
  });
});
