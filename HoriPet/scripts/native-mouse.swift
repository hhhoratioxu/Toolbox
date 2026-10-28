// Acceptance driver only. Use only with explicit authorization to send OS input.
// Compile locally: swiftc scripts/native-mouse.swift -o .tools/native-mouse
import CoreGraphics
import Foundation

let args = Array(CommandLine.arguments.dropFirst())
guard args.count >= 3, let x = Double(args[1]), let y = Double(args[2]) else { exit(2) }
func post(_ kind: CGEventType, _ x: Double, _ y: Double) {
    CGEvent(mouseEventSource: nil, mouseType: kind,
            mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: (kind == .rightMouseDown || kind == .rightMouseUp) ? .right : .left)?.post(tap: .cghidEventTap)
}
post(.mouseMoved, x, y)
Thread.sleep(forTimeInterval: 0.25)
if args[0] == "right" {
    post(.rightMouseDown, x, y)
    Thread.sleep(forTimeInterval: 0.08)
    post(.rightMouseUp, x, y)
}
if args[0] == "click" || args[0] == "drag" {
    post(.leftMouseDown, x, y)
    Thread.sleep(forTimeInterval: 0.08)
    if args[0] == "drag", args.count == 5, let endX = Double(args[3]), let endY = Double(args[4]) {
        for step in 1...24 {
            let t = Double(step) / 24
            post(.leftMouseDragged, x + (endX - x) * t, y + (endY - y) * t)
            Thread.sleep(forTimeInterval: 0.035)
        }
        post(.leftMouseUp, endX, endY)
    } else { post(.leftMouseUp, x, y) }
}
