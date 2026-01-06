// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "StorytellerSDK",
    platforms: [
        .iOS(.v13),
        .macOS(.v10_15)
    ],
    products: [
        .library(
            name: "StorytellerSDK",
            targets: ["StorytellerSDK"]
        ),
    ],
    dependencies: [
        // Add external dependencies here if needed
    ],
    targets: [
        .target(
            name: "StorytellerSDK",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "StorytellerSDKTests",
            dependencies: ["StorytellerSDK"],
            path: "Tests"
        ),
    ]
)