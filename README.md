# Custom Launcher - MilleniumMods

*¿Qué es Custom Launcher?* 💡
- Es un Launcher de Minecraft personalizable basado en ElectronJS que tiene el objetivo de facilitar el acceso a un Launcher propio personalizable a los administradores de servidores y comunidades de bajo presupuesto que no pueden permitirse el desarrollar una alternativa 100% personalizada para sus jugadores. 

*¿Cómo se miden las actualizaciones?* ❔
- Nuestro sistema de versiones se basa en *Actualizaciones mayores*/*Cambios al frontend*/*Cambios al backend*, por ejemplo, la versión **1.4.13** tendría detrás **1** actualización mayor (Se considera "mayor" por el equipo), 4 actualizaciones o cambios al front-end, y 13 actualizaciones o cambios al back-end.

<!-- CONTRIBUCIÓN -->
# Contribución 🆘
Custom Launcher es un projecto open-source creado y administrado por MilleniumMods, sin embargo, estamos totalmente abiertos a cualquier aporte ya sea monetario, o en forma de código mediante Pull Requests. Si te interesa aportar de cualquier forma al proyecto, o incluso formar parte del equipo de desarrollo, no dudes en contactarte con nosotros vía [Discord](https://discord.milleniummods.com)

**Pull Requests** 🔀
1. Crea un [Fork]() del proyecto
2. Crea una nueva branch dentro de tu fork para realizar cambios
3. Guarda tus cambios
4. Realiza una [Pull Request]() para que tus cambios sean revisados
5. ¡Muchas gracias por las contribuciones!

**Instrucciones y recomendaciones al contribuir**
- Asegúrate de actualizar la versión dentro del package.json basada a nuestra guía de versiones.
- Asegúrate de probar tus cambios antes de hacer commit

<!-- COMPILAR POR TU CUENTA -->
# Cómo compilar por tu cuenta
**Requerimientos:**
- Sistema operativo: Windows 7 en adelante ; Linux [Testeado en Ubuntu 22.04]
- NodeJS v16

**Clonar e instalar las depedencias:**

```console
> git clone https://github.com/MilleniumMods/Custom-Launcher.git
> cd Custom-Launcher
> npm install
```

```console
> npm start
```

<!-- INSTALACIÓN -->
# Instalación 📥
Si eres un usuario y solo quieres usar el launcher, sigue estos pasos:
1. Descarga el instalador desde la sección de [Releases]().
2. Ejecuta el archivo `.exe`.
3. ¡Configura tu nickname y a jugar!

## Dependencias principales 📦
- **Electron**: Framework para la aplicación de escritorio.
- **Sass**: Para el preprocesamiento de estilos.
- **minecraft-launcher-core**: Motor principal para el inicio del juego.
- **Bootstrap**: Base para algunos componentes del UI.

<!-- OBJETIVOS -->
# Objetivos 🗒️

- [x] Organizar de forma correcta el GitHub
- [x] Añadir changelog
- [x] Añadir instrucciones para compilar
- [x] Solucionar problemas de seguridad por Electron (Advertencia en los logs de la consola)
- [x] Lograr iniciar Minecraft desde el back-end
    - [x] Instalación Vanilla con versión personalizada
    - [ ] Instalación Forge
    - [ ] Instalación Fabric
- [x] Crear el front-end principal
- [x] Utilizar regex para los parámetros permitidos en algunas opciones (Cómo el Nickname)
- [x] Guardar los datos personalizables luego de reiniciar la aplicación
- [x] Añadir soporte opcional para cuentas de Mojang y Microsoft
- [x] Añadir soporte para múltiples versiones 
- [ ] Añadir soporte para instalar Forge/Fabric automáticamente
- [ ] Publicar al npm registry para compilar y publicar para desarrollo más fácilmente
- [x] Añadir lista de dependencias (Si aplica)
- [x] Añadir una sección de instalación en este archivo
- [x] Crear opciones modulares:
    - [x] Instalación de Modpack fijo automáticamente 
    - [x] Actualización automática de modpacks
    - [x] Estilo de botones personalizado 
    - [x] Botones de redes/links importantes con íconos personalizados
- [x] Volver Open-Source una vez el código no sea completamente un meme
- [x] Soporte multi-lenguaje:
    - [x] Español
    - [x] Inglés 
- [ ] Almacenar en cache ciertas funciones para acelerar los tiempos de carga
- [ ] Añadir mejor compatibilidad/shortcuts para VisualStudioCode
- [x] **NUEVOS OBJETIVOS (V0.3.0+)**:
    - [x] Integración con **Discord Rich Presence** (Mostrar qué estás jugando)
    - [x] Pinger de servidor integrado (Ver si el servidor está online desde el launcher)
    - [x] Selección de fondo dinámico desde los ajustes (Mejorado)
    - [ ] Implementar sistema de **Auto-Update** para el launcher
    - [x] Visor de skins 3D funcional en la pestaña de Skins

<!-- LICENCIA -->
# Licencia
Este proyecto utiliza la licencia Apache License 2.0
