# macOS Widget Setup Guide

To create a native macOS desktop widget for CC Checker, follow these steps:

## 1. Create a New Xcode Project
- Open Xcode and create a new **App** project for macOS.
- Name it `CCCheckerHost`.
- Use **SwiftUI** for the interface.

## 2. Add a Widget Extension
- Go to `File > New > Target`.
- Select **Widget Extension**.
- Name it `CCCheckerWidget`.
- Ensure "Include Configuration App Intent" is **unchecked**.

## 3. Replace Widget Code
- Copy the contents of `macos_widget/WidgetView.swift` and replace the code in your `CCCheckerWidget.swift` file.

## 4. Grant Full Disk Access (or sandbox exception)
- The widget needs to read `/Users/adminuser/vsc/cc_checker/widget_data.json`.
- In the Xcode project settings for the **Widget Extension**, go to `Signing & Capabilities`.
- If "App Sandbox" is enabled, you may need to disable it or add a specific file access entitlement to read the JSON file in the project directory.

## 5. Add to Desktop
- Build and run the `CCCheckerHost` app once.
- Right-click your desktop or open the Widget Gallery.
- Find **CC Checker Status** and drag it to your desktop.

## How it Works
- The Python script `runner/start.py` calls `runner/update_widget.py` after each card is processed.
- This updates `widget_data.json`.
- The macOS widget reads this JSON file and updates its display automatically.
