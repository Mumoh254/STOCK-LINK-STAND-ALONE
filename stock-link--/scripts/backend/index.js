const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');

const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const authRoutes = require('./routes/auth');

const healthCheck = (req, res) => res.status(200).json({ status: 'ok' });

function startExpressApp() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));


  // Add this to your backend server
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

  app.get('/api/health', healthCheck);
  app.use('/api/products', productRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/uploads', express.static(uploadsDir));

  app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ Backend server running at http://127.0.0.1:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Node.js version: ${process.version}`);
  });
}

// 👇 This was missing
startExpressApp();
