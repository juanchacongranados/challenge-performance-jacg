import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = "https://dummyjson.com";
const productsCreated = new Counter("products_created");

const rate = Number(__ENV.RATE || 50);

if (![50, 100].includes(rate)) {
  throw new Error("RATE debe ser 50 o 100");
}

export const options = {
  scenarios: {
    create_products: {
      executor: "constant-arrival-rate",
      rate,
      timeUnit: "1s",
      duration: __ENV.DURATION || "1m",
      preAllocatedVUs: 100,
      maxVUs: 300,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

export function setup() {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      username: "emilys",
      password: "emilyspass",
      expiresInMins: 60,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const loginSuccessful = check(response, {
    "Autenticación JWT exitosa": (r) =>
      r.status === 200 && Boolean(r.json("accessToken")),
  });

  if (!loginSuccessful) {
    throw new Error(
      `No se pudo obtener JWT. HTTP ${response.status}: ${response.body}`,
    );
  }

  return {
    token: response.json("accessToken"),
    runId: `${Date.now()}-${Math.random().toString(36).slice(2)}-${rate}`,
  };
}

export default function (data) {
  const uniqueTitle = `Monnet-${data.runId}-VU${__VU}-ITER${__ITER}`;

  const response = http.post(
    `${BASE_URL}/products/add`,
    JSON.stringify({
      title: uniqueTitle,
      price: 99.99,
    }),
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
      },
      tags: {
        endpoint: "create_product",
      },
    },
  );

  if (response.status !== 200 && response.status !== 201 && __ITER === 0) {
    console.error(
      `Error HTTP ${response.status}: ${String(response.body).slice(0, 150)}`,
    );
  }

  const successful = check(response, {
    "Producto creado HTTP 200 o 201": (r) =>
      r.status === 200 || r.status === 201,
    "Respuesta contiene título enviado": (r) => {
      try {
        return r.json("title") === uniqueTitle;
      } catch {
        return false;
      }
    },
    "Respuesta contiene precio numérico": (r) => {
      try {
        return typeof r.json("price") === "number";
      } catch {
        return false;
      }
    },
  });

  if (successful) {
    productsCreated.add(1);
  }
}
