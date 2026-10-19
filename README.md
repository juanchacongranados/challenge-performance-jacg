# Challenge Monnet — Pruebas de Performance

**Autor:** Juan Alexander Chacón Granados  
**Herramienta:** k6  
**API:** DummyJSON

## 1. Objetivo

Evaluar el comportamiento del endpoint `POST https://dummyjson.com/products/add` bajo dos escenarios de carga:

- 50 transacciones por segundo (TPS) durante 60 segundos.
- 100 transacciones por segundo (TPS) durante 60 segundos.

Se utiliza un único script configurable para ejecutar ambos escenarios.

## 2. Requisitos previos

- Tener k6 instalado.
- Contar con conexión a Internet.
- Disponer de acceso a `https://dummyjson.com`.

Verificar la instalación:

```bash
k6 version
```

En macOS, k6 puede instalarse mediante Homebrew:

```bash
brew install k6
```

No se requiere instalar Node.js ni dependencias adicionales para ejecutar este proyecto.

## 3. Estructura del proyecto

```text
challenge-performance-jacg/
├── products-load.js
├── resultado-50tps.json
├── resultado-100tps.json
└── README.md
```

El informe no técnico se incorporará como un archivo adicional.

## 4. Autenticación

Antes de iniciar la prueba de carga, la función `setup()` ejecuta:

`POST https://dummyjson.com/auth/login`

Credenciales de demostración:

- Usuario: `emilys`
- Contraseña: `emilyspass`

La respuesta proporciona un JWT, que se utiliza posteriormente en las solicitudes de creación de productos.

El token se obtiene dinámicamente. No es necesario copiar ni configurar manualmente un JWT.

## 5. Solicitudes de creación

Endpoint:

`POST https://dummyjson.com/products/add`

Headers:

```text
Authorization: Bearer <JWT obtenido en setup()>
Content-Type: application/json
```

Ejemplo del cuerpo enviado:

```json
{
  "title": "Monnet-identificador-unico-VU1-ITER0",
  "price": 99.99
}
```

Cada solicitud genera un título diferente mediante un identificador de ejecución, el usuario virtual y el número de iteración.

El precio se envía como valor numérico.

## 6. Ejecución

Abrir una terminal en la carpeta raíz del proyecto.

### Escenario 1 — 50 TPS durante 1 minuto

```bash
k6 run -e RATE=50 --summary-export=resultado-50tps.json products-load.js
```

### Escenario 2 — 100 TPS durante 1 minuto

```bash
k6 run -e RATE=100 --summary-export=resultado-100tps.json products-load.js
```

El parámetro `RATE` acepta únicamente los valores `50` y `100`.

Si no se proporciona `DURATION`, la duración predeterminada es de un minuto.

### Prueba diagnóstica opcional

Para ejecutar 50 TPS durante cinco segundos:

```bash
k6 run -e RATE=50 -e DURATION=5s products-load.js
```

Esta ejecución corta no reemplaza los escenarios obligatorios de un minuto.

## 7. Estrategia de carga

Se utiliza el ejecutor `constant-arrival-rate` de k6.

Esto permite programar el inicio de nuevas iteraciones a una tasa constante, independientemente del tiempo que tarde cada solicitud.

La autenticación se ejecuta una vez mediante `setup()` y no forma parte de las iteraciones de creación de productos.

Se configuran inicialmente 100 usuarios virtuales, con posibilidad de incrementar hasta 300 según la demanda.

## 8. Validaciones

Cada operación verifica:

1. Que la respuesta HTTP sea 200 o 201.
2. Que el título recibido coincida con el enviado.
3. Que el precio recibido sea numérico.

Además, se establecen los siguientes criterios de referencia:

- Tasa de errores HTTP inferior al 5 %.
- Percentil 95 del tiempo de respuesta inferior a 2 segundos.

Estos criterios son definidos para el ejercicio; no representan requisitos de servicio publicados por DummyJSON.

## 9. Resultados obtenidos

| Métrica                 |    50 TPS |   100 TPS |
| ----------------------- | --------: | --------: |
| Duración                |      60 s |      60 s |
| Iteraciones completadas |     3,001 |     5,998 |
| Creaciones exitosas     |     1,259 |     1,697 |
| Creaciones fallidas     |     1,742 |     4,301 |
| Errores HTTP globales   |   58.02 % |   71.69 % |
| Tiempo promedio         | 223.19 ms | 220.46 ms |
| Tiempo p95              | 270.74 ms | 256.41 ms |
| Iteraciones descartadas |         0 |         3 |

Los valores globales de solicitudes HTTP incluyen la autenticación inicial.

## 10. Hallazgos y limitaciones

Durante las pruebas de carga se observaron respuestas HTTP 429:

```text
{"message":"request limit exceeded, please wait a few seconds"}
```

Esto evidencia que el servicio público aplica límites de solicitudes bajo carga.

Aunque los tiempos de respuesta se mantuvieron por debajo del umbral establecido, las tasas de error superaron el 5 % en ambos escenarios.

DummyJSON es una API pública de demostración. Sus resultados no deben extrapolarse al rendimiento de una infraestructura productiva de Monnet.

El endpoint de creación simula la operación; no se asume persistencia real de los productos.

## 11. Evidencias

Los archivos:

- `resultado-50tps.json`
- `resultado-100tps.json`

contienen los resúmenes exportados por k6 de las ejecuciones realizadas.

El reporte no técnico presenta la comparación, los principales hallazgos y las conclusiones.

## 12. Reproducibilidad

Para reproducir las pruebas:

1. Clonar o descargar este repositorio.
2. Instalar k6.
3. Abrir una terminal en la carpeta del proyecto.
4. Ejecutar los comandos de la sección 6.
5. Revisar el resumen en terminal y los archivos JSON generados.

Los resultados pueden variar por condiciones de red, disponibilidad del servicio y límites de solicitudes de DummyJSON.
