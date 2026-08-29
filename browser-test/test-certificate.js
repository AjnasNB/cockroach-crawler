import { generateKeyPairSync, sign } from "node:crypto";

export function generateTestCertificate(commonName) {
  if (!/^(?:\*\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(commonName)) {
    throw new TypeError("Test certificate common names must be bounded DNS names.");
  }

  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKeyDer = publicKey.export({ type: "pkcs1", format: "der" });
  const oneYear = 365 * 24 * 60 * 60 * 1_000;
  const notBefore = new Date(Date.now() - oneYear);
  const notAfter = new Date(Date.now() + oneYear);
  const name = distinguishedName(commonName);
  const signatureAlgorithm = DER.sequence([
    DER.objectIdentifier("1.2.840.113549.1.1.11"),
    DER.null()
  ]);
  const certificateBody = DER.sequence([
    DER.explicitContext(0, DER.integer(1)),
    DER.integer(1),
    signatureAlgorithm,
    name,
    DER.sequence([DER.date(notBefore), DER.date(notAfter)]),
    name,
    DER.sequence([
      DER.sequence([
        DER.objectIdentifier("1.2.840.113549.1.1.1"),
        DER.null()
      ]),
      DER.bitString(publicKeyDer)
    ])
  ]);
  const signature = sign("sha256", certificateBody, privateKey);
  const certificate = DER.sequence([
    certificateBody,
    signatureAlgorithm,
    DER.bitString(signature)
  ]);

  return {
    cert: [
      "-----BEGIN CERTIFICATE-----",
      ...certificate.toString("base64").match(/.{1,64}/g),
      "-----END CERTIFICATE-----"
    ].join("\n"),
    key: privateKey.export({ type: "pkcs1", format: "pem" })
  };
}

function distinguishedName(commonName) {
  return DER.sequence([
    DER.set([DER.sequence([
      DER.objectIdentifier("2.5.4.3"),
      DER.printableString(commonName)
    ])]),
    DER.set([DER.sequence([
      DER.objectIdentifier("2.5.4.10"),
      DER.printableString("Cockroach Crawler test fixture")
    ])])
  ]);
}

function encodeBase128(value) {
  const bytes = [];
  do {
    let byte = value & 127;
    value >>>= 7;
    if (bytes.length) byte |= 128;
    bytes.push(byte);
  } while (value > 0);
  return Buffer.from(bytes.reverse());
}

class DER {
  static sequence(data) {
    return this.encode(48, Buffer.concat(data));
  }

  static integer(value) {
    if (!Number.isInteger(value) || value < -128 || value > 127) {
      throw new TypeError("Test certificate integers must fit in one DER byte.");
    }
    return this.encode(2, Buffer.from([value]));
  }

  static objectIdentifier(value) {
    const parts = value.split(".").map(Number);
    const output = [encodeBase128(40 * parts[0] + parts[1])];
    for (let index = 2; index < parts.length; index += 1) {
      output.push(encodeBase128(parts[index]));
    }
    return this.encode(6, Buffer.concat(output));
  }

  static null() {
    return Buffer.from([5, 0]);
  }

  static set(data) {
    return this.encode(49, Buffer.concat(data));
  }

  static explicitContext(tag, data) {
    return this.encode(160 + tag, data);
  }

  static printableString(value) {
    return this.encode(19, Buffer.from(value));
  }

  static bitString(value) {
    return this.encode(3, Buffer.concat([Buffer.from([0]), value]));
  }

  static date(value) {
    const year = value.getUTCFullYear();
    const generalized = year >= 2050;
    const parts = [
      generalized ? String(year) : String(year).slice(-2),
      String(value.getUTCMonth() + 1).padStart(2, "0"),
      String(value.getUTCDate()).padStart(2, "0"),
      String(value.getUTCHours()).padStart(2, "0"),
      String(value.getUTCMinutes()).padStart(2, "0"),
      String(value.getUTCSeconds()).padStart(2, "0")
    ];
    return this.encode(generalized ? 24 : 23, Buffer.from(`${parts.join("")}Z`));
  }

  static encode(tag, data) {
    return Buffer.concat([Buffer.from([tag]), this.length(data.length), data]);
  }

  static length(value) {
    if (value < 128) return Buffer.from([value]);
    const bytes = [];
    while (value > 0) {
      bytes.unshift(value & 255);
      value >>= 8;
    }
    return Buffer.from([128 | bytes.length, ...bytes]);
  }
}
