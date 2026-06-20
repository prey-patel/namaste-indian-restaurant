# Device Support and Browser Compatibility Notes

This document details device-specific requirements and support matrix details for the notification and sound systems.

> [!NOTE]
> System notifications and custom sound loops are **supported where browser, operating system, PWA installation, notification permission, and device settings allow**. No background custom sound loops are guaranteed. OS controls and hardware mute states override browser Web Audio API at all times.

## Browser Support Matrix

| Feature | Chrome (Desktop/Android) | Safari (macOS/iOS) | Firefox (Desktop) | Edge (Desktop) |
| :--- | :--- | :--- | :--- | :--- |
| **Web Audio API** | Full | Full | Full | Full |
| **PWA Installable** | Full | Full (iOS 16.4+) | Full | Full |
| **Web Push (Foreground)** | Full | Full (iOS 16.4+) | Full | Full |
| **Web Push (Background)** | Full | Full (iOS 16.4+) | Full | Full |
| **Autoplay Audio Unlock** | Requires interaction | Requires interaction | Requires interaction | Requires interaction |

---

## iOS / Safari Special Requirements

Due to Apple's strict privacy and power-management rules, the following requirements apply to Web Push on iOS:
1. **Home Screen PWA requirement**: On iOS (16.4+), push notifications **only** work if the user installs the web application to their Home Screen.
   - Access the site in Safari.
   - Click the **Share** button.
   - Tap **"Add to Home Screen"**.
   - Open the installed application from the Home Screen.
2. **First Interaction constraint**: The AudioContext is baselined as `suspended` on page load. A user gesture (e.g. tapping "Enable Sound" or clicking anywhere on the screen) is required to transition the AudioContext to `running` to play any alert sound.

---

## OS/Browser-Level Sound Control

Sound playback is also governed by operating system and browser preferences:
- **Focus Assist / Do Not Disturb**: If the operating system is in Do Not Disturb mode, background push notifications will show up silently without sound or banners depending on OS settings.
- **Browser Site Permissions**: If a site is blocked from playing sound (via site settings in Chrome/Firefox), the Web Audio API will throw an error or play silently. Make sure the site permission is set to "Allow Sound".
- **Hardware Mute Switch**: On iPhones and iPads, the hardware silent switch overrides any Web Audio API sound. The device must be unmuted to play audio.
- **Battery Saver / Sleep Modes**: Operating systems may restrict background workers (Service Worker push triggers) when the battery level is low or when battery saver mode is enabled. Ensure high-performance background activity is allowed for the PWA in system settings.
