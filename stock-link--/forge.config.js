const path = require('path');

module.exports = {
  packagerConfig: {
 asar: false,
    icon: path.resolve(__dirname, 'src/image/favicon.ico'), // App icon

    // 🗃️ Include backend scripts and native modules
    extraResource: [
      {
        from: path.resolve(__dirname, 'scripts/backend'),
        to: 'scripts/backend',
        filter: [
          '**/*',
          '!**/node_modules/fsevents/**',
          '!**/node_modules/fsevents*'
        ]
      },
      {
        from: path.resolve(__dirname, 'node_modules/better-sqlite3'),
        to: 'node_modules/better-sqlite3'
      }
    ],

    // 🧾 Windows metadata
    appBundleId: 'com.stocklink.app',
    win32metadata: {
      CompanyName: 'Welt Tallis Cooperation',
      FileDescription: 'StockLink Inventory Management',
      ProductName: 'StockLink StandAlone Software'
    },

    // ⛔ Exclude macOS-specific modules
    ignore: [
      /node_modules[\\\/]fsevents/,
      /node_modules\/fsevents/
    ]
  },

  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'stocklink',
        setupIcon: path.resolve(__dirname, 'src/image/favicon.ico')
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ],

  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives', // 👇 Required for native modules like better-sqlite3
      config: {}
    }
  ]
};
