# Capacitor — native wrapping (deferred)

The web app is **Capacitor-enabled**: `capacitor.config.json` is present and the
Vite build emits `dist/`, which Capacitor consumes as its `webDir`. Adding the
native `ios/` and `android/` platform folders is **deferred** because it requires
Xcode (iOS) and Android Studio (Android) toolchains that are out of scope here.

## Config

`web/capacitor.config.json`:

```json
{
  "appId": "com.emosh.treats",
  "appName": "Emosh Treats",
  "webDir": "dist"
}
```

- `appId` — reverse-DNS bundle identifier for the native apps.
- `appName` — display name.
- `webDir` — points at the Vite build output (`dist`), so `npx cap sync` copies the
  freshly built web assets into the native projects.

## Current state

With no platforms added, `npx cap sync` succeeds as a config-validation / no-op
(it prints something like `No platforms found` — that is expected and is a PASS).

```
npm run build     # produce web/dist
npx cap sync      # validates config; no platforms yet -> no-op
```

## Deferred native workflow

When ready to build the native apps (needs Xcode / Android Studio installed):

```
npm run build                       # 1. build the web assets into dist/
npm i @capacitor/ios @capacitor/android
npx cap add ios                     # 2. scaffold native iOS project
npx cap add android                 # 2. scaffold native Android project
npx cap sync                        # 3. copy dist/ + plugins into native projects
npx cap open ios                    # 4. open in Xcode           (requires Xcode)
npx cap open android                # 4. open in Android Studio  (requires Android Studio)
```

Re-run `npm run build && npx cap sync` after every web change to refresh the native
copies.

## TODO — in-app purchase (username unlock, issue 06)

The future username-unlock feature (issue 06) will gate a purchase behind a
Capacitor **in-app purchase** plugin (e.g.
[`@capacitor-community/in-app-purchases`](https://github.com/capacitor-community/in-app-purchases))
once the native platforms are added. This is intentionally **not implemented yet** —
it is a documented TODO to wire up when `ios/` / `android/` platforms exist and IAP
products are configured in App Store Connect / Google Play Console.
