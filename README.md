# Raíz y Cera — E-Commerce & Headless CMS Autocontenido
> *"Raíces que iluminan"* · Alta Cerería Botánica en Cera de Soya 100% Natural Hecha a Mano en México.

Plataforma web completa de promoción, catálogo interactivo con explorador olfativo piramidal (Salida, Corazón y Fondo), tienda en línea con 3 modos de pago (**Stripe**, puente **Shopify / Etsy** y **WhatsApp Concierge**), y **Panel de Administración estilo WordPress** autocontenido y portable.

---

## 🌟 Características Principales

1. **Estética Editorial de Lujo**:
   - Inspirada en la arquitectura de marca de **Candle Delirium**, **Bath & Body Works** y **Yankee Candle**.
   - Paleta cromática extraída de la identidad visual de los 3 catálogos: Terracota cálido (`#8C4A27`), Ámbar tradicional (`#B85D19`), Dorado sutil (`#9C7A44`) y Arena desértica (`#F8F5F0`).
   - Tipografía editorial *Playfair Display* con proporciones equilibradas para lectura en computadoras, tabletas y teléfonos.

2. **Catálogo Real Extraído de los 3 Catálogos Oficiales**:
   - **Colección Otoño 2026**: *Cosecha de Otoño* (3 y 6 calabazas), *Tierra* (base ovalada), *Nido* (frasco de vidrio), *Abrigo* (florivelas en madera).
   - **Colección Día de Muertos 2026**: *Memorias* (con grabado y tapa personalizada), *Tradición · Paquete Ofrenda* (9, 6 y 3 piezas + individuales de Cempasúchil, Pan de Muerto y Papel Picado), *Ofrenda* (arreglo 3 cempasúchil), *Catrina* (taza ceremonial pintada).
   - **Temporada de Luz 2026 (Colección Especial de Invierno y Año Nuevo)**: *Postales de Invierno* (*Flor de Invierno*, *Escarcha*, *Luces Dorado/Rojo*), *Trío de Invierno* (3 sinergias), *Ritual Navideño* (derretidor + 3 latas de wax melts + cerillos), *Luz de Hogar* (centro monumental), *Bosque Nevado* (12cm y 18cm), *Pinos de Marfil*, *Magia de Diciembre* (Árbol + Jengibre o Reno), *Destellos*, *Nuevos Comienzos* (Set Ritual de Gratitud, Abundancia y Nuevos Comienzos).

3. **Arquitectura Olfativa & Pirámide de Aromas**:
   - 11 perfiles aromáticos de alta fidelidad con notas clasificadas en **Salida**, **Corazón** y **Fondo**.
   - Selector interactivo de aroma en la ficha de cada producto y filtro facetado por familia olfativa (*Cálido & Especiado*, *Amaderado & Botánico*, *Floral & Tradicional*, *Dulce & Gourmand*, *Fresco & Cítrico*).

4. **Personalización Interactiva**:
   - Las velas marcadas como **✦ Personalizable** (ej. *Memorias*, *Nido*, *Abrigo*, *Ritual Navideño*, *Nuevos Comienzos*) despliegan un campo interactivo con contador de caracteres y vista previa en tiempo real para nombres en tapas de vidrio o dedicatorias de regalo.

5. **3 Modos de Checkout Conmutables**:
   - **Stripe Checkout**: Simulación interactiva tipo Sandbox para pruebas en GitHub Pages y conexión en vivo vía Stripe Payment Links o sesiones privadas de API.
   - **Shopify & Etsy Bridge**: Enlaces directos a listados de marketplace y generador/exportador en 1 clic de archivos CSV oficiales listos para importar en Shopify y Etsy.
   - **WhatsApp Concierge (`55 2702 6347`)**: Formatea de forma automática el resumen del carrito con presentación, aromas seleccionados, personalización y datos de entrega en un mensaje listo para enviar.
   - **Regla de Envío Configurable**: Envío gratis predeterminado desde **$600 MXN** con barra de progreso en la bolsa de compras.

6. **Panel de Administración Estilo WordPress (`admin.html`)**:
   - Barra lateral oscura con pestañas: *Escritorio*, *Carruseles & Banners*, *Productos & Precios*, *Biblioteca de Aromas*, *Entradas & Guías*, *Ajustes & Envíos*, *Integraciones (Stripe, Shopify, Etsy)*.
   - Edición visual sin necesidad de tocar código.
   - Botón *"Descargar JSON para GitHub"* para respaldar y actualizar el repositorio estático.

---

## 📁 Estructura del Proyecto

```text
raiz-y-cera/
├── index.html                  # Tienda insignia, catálogo facetado, explorador olfativo y bolsa
├── admin.html                  # Panel de administración estilo WordPress (CMS visual)
├── README.md                   # Documentación y manual de despliegue
├── data/
│   └── cms_store.json          # Base de datos portable (productos, aromas, blog, ajustes)
├── assets/
│   ├── css/
│   │   ├── main.css            # Estilos editoriales de la tienda (Candle Delirium style)
│   │   └── admin.css           # Estilos del panel CMS estilo WordPress
│   └── images/
│       ├── brand/              # Logotipos Raíz y Cera extraídos
│       ├── hero/               # Fondos de portada y colecciones
│       └── products/           # 29 recortes PNG en alta resolución extraídos de los PDFs
├── src/
│   ├── domain/
│   │   └── models.js           # Modelos OOP: Product, ProductVariant, FragranceProfile, CartItem
│   ├── services/
│   │   ├── cms_repository.js   # Dual-Storage CMSRepository (JSON + LocalStorage + REST)
│   │   ├── catalog_engine.js   # Motor de filtros facetados y búsqueda olfativa
│   │   ├── cart_service.js     # Gestión de bolsa, reglas de envío y cálculo de totales
│   │   ├── checkout_orchestrator.js # Orquestador Stripe, Shopify/Etsy y WhatsApp
│   │   └── marketplace_exporter.js  # Exportador oficial CSV para Shopify y Etsy
│   ├── ui/
│   │   └── storefront_controller.js # Controlador principal del Storefront
│   └── admin/
│       └── cms_admin_controller.js  # Controlador del Panel estilo WordPress
├── server/
│   └── portable_cms_server.py  # Microservidor Python opcional para hosting de paga o local
└── tools/
    ├── extract_catalog_assets.py # Extractor PyMuPDF de imágenes de los catálogos PDF
    └── extraction_manifest.json  # Mapeo de reglas y referencias xref de los PDFs
```

---

## 🚀 Cómo Trabajar en Tu Computadora (Desarrollo Local)

Puedes abrir y probar el proyecto de dos formas sencillas:

### Opción A: Con el Microservidor Portable (Recomendado)
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
python3 server/portable_cms_server.py --port 8080
```
- **Tienda en vivo**: Abre [http://localhost:8080/index.html](http://localhost:8080/index.html)
- **Panel Admin CMS**: Abre [http://localhost:8080/admin.html](http://localhost:8080/admin.html)

*(Al usar el microservidor, cualquier cambio guardado en el Panel Admin se escribe directamente al archivo `data/cms_store.json` en tu disco)*.

### Opción B: Con cualquier servidor web local
```bash
python3 -m http.server 8000
# Abre http://localhost:8000/
```

---

## 🌐 Cómo Publicar Gratis en GitHub Pages (Paso a Paso)

Para que la emprendedora pueda ver la página en su teléfono o computadora y darte su opinión:

1. **Crea un repositorio en tu cuenta de GitHub**:
   - Nombre sugerido: `raiz-y-cera`.
2. **Inicializa git y sube los archivos**:
   ```bash
   cd /Users/renejimenez/Documents/GitHub/raiz-y-cera
   git init
   git add .
   git commit -m "Lanzamiento inicial: Raíz y Cera E-Commerce & CMS"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/raiz-y-cera.git
   git push -u origin main
   ```
3. **Activa GitHub Pages**:
   - Entra a tu repositorio en GitHub en el navegador.
   - Ve a **Settings** > **Pages**.
   - En **Build and deployment > Branch**, selecciona `main` y la carpeta `/(root)`.
   - Haz clic en **Save**.
4. ¡Listo! En 1 a 2 minutos tu página estará disponible públicamente en:
   `https://TU-USUARIO.github.io/raiz-y-cera/`

---

## 🔄 Flujo de Trabajo para Actualizar Contenidos con la Emprendedora

1. Tú o la emprendedora ingresan a `https://TU-USUARIO.github.io/raiz-y-cera/admin.html`.
2. Hacen los cambios deseados (ajustar precios, editar aromas, cambiar textos o banners).
3. Hacen clic en el botón superior **"💾 Descargar JSON para GitHub"**.
4. Ese archivo descargado reemplaza a `data/cms_store.json` en tu carpeta local.
5. Haces `git commit -am "Actualización de catálogo"` y `git push`. La página web se actualizará automáticamente en GitHub Pages en segundos.

---

## 📦 Exportación a Shopify y Etsy en 1 Clic

Si la emprendedora decide abrir canales de venta en Shopify o Etsy:
1. En el **Panel Admin** (`admin.html`), haz clic en **"🛍️ Exportar Shopify CSV"** o **"🧡 Exportar Etsy CSV"**.
2. Ve a tu panel de Shopify (`Productos > Importar`) o Etsy y sube el archivo generado.
3. Todo el catálogo se importará con sus títulos, descripciones, categorías, precios por variante, aromas y etiquetas oficiales.

---

## 🏢 Migración a Hosting de Paga

Cuando la emprendedora apruebe la página para su dominio oficial (ej. `raizycera.mx`):
- **Hosting Compartido / cPanel / Hostinger**: Solo sube todo el contenido de la carpeta por FTP o File Manager a `public_html`.
- **VPS / Docker / Cloud**: Ejecuta `python3 server/portable_cms_server.py --port 80` o utiliza un proxy inverso NGINX.
- **Vercel / Netlify**: Conecta tu repositorio de GitHub directamente; se despliega con cero configuración adicional.

---

## 📞 Créditos y Contacto de la Marca
- **Marca**: Raíz y Cera (*Raíces que iluminan*)
- **WhatsApp**: [55 2702 6347](https://wa.me/525527026347)
- **Instagram**: [@raizycera](https://www.instagram.com/raizycera)
