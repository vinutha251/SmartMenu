const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = 'restaurant-secret-key-2024';

// Database (in-memory for demo)
let users = [
  {
    id: 1,
    email: 'admin@restaurant.com',
    password: '$2a$10$XZQKk7QJz7V6V8h9g0jK0uBd8f9g0jK0uBd8f9g0jK0uBd8f9g0jK0u', // admin123
    name: 'Admin',
    role: 'admin'
  }
];

let tables = [
  { id: 1, number: 1, status: 'available', capacity: 2, waitTime: 0 },
  { id: 2, number: 2, status: 'occupied', capacity: 4, waitTime: 30 },
  { id: 3, number: 3, status: 'reserved', capacity: 2, waitTime: 15 },
  { id: 4, number: 4, status: 'available', capacity: 6, waitTime: 0 },
  { id: 5, number: 5, status: 'occupied', capacity: 4, waitTime: 45 },
  { id: 6, number: 6, status: 'available', capacity: 2, waitTime: 0 },
  { id: 7, number: 7, status: 'available', capacity: 4, waitTime: 0 },
  { id: 8, number: 8, status: 'reserved', capacity: 8, waitTime: 20 }
];

let menuItems = [
  {
    id: 1,
    name: "Masala Dosa",
    description: "Crispy rice crepe with spiced potatoes, served with coconut chutney and sambar",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop",
    allergens: ["dairy", "gluten"],
    category: "South Indian"
  },
  {
    id: 2,
    name: "Truffle Pizza",
    description: "Wood-fired pizza with truffle oil, wild mushrooms, and mozzarella",
    price: 24.99,
    image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=300&fit=crop",
    allergens: ["dairy", "gluten"],
    category: "Italian"
  },
  {
    id: 3,
    name: "Premium Pad Thai",
    description: "Authentic Thai stir-fried rice noodles with tiger prawns and peanuts",
    price: 18.99,
    image: "https://images.unsplash.com/photo-1559314809-2b99056a8c4a?w=400&h=300&fit=crop",
    allergens: ["peanuts", "shellfish"],
    category: "Thai"
  },
  {
    id: 4,
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with molten center, served with vanilla ice cream",
    price: 10.99,
    image: "https://images.unsplash.com/photo-1624353365286-3f8d62dadadf?w=400&h=300&fit=crop",
    allergens: ["dairy", "eggs", "gluten"],
    category: "Desserts"
  },
  {
    id: 5,
    name: "Grilled Salmon",
    description: "Atlantic salmon grilled to perfection with lemon butter sauce",
    price: 28.99,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    allergens: ["fish"],
    category: "Seafood"
  },
  {
    id: 6,
    name: "Beef Burger",
    description: "Premium Angus beef patty with cheddar, lettuce, and special sauce",
    price: 16.99,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    allergens: ["dairy", "gluten"],
    category: "Burgers"
  }
];

let orders = [];
let payments = [];

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ========== API ENDPOINTS ==========

// 1. Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // For demo, allow "admin123" without checking hash
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Tables
app.get('/api/tables', (req, res) => {
  res.json({
    success: true,
    tables
  });
});

// 3. Get Menu
app.get('/api/menu', (req, res) => {
  res.json({
    success: true,
    menuItems
  });
});

// 4. Create Order (Protected)
app.post('/api/orders', authenticateToken, (req, res) => {
  try {
    const { tableId, items, totalAmount } = req.body;
    
    // Find table
    const table = tables.find(t => t.id === parseInt(tableId));
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Calculate amounts
    const tax = totalAmount * 0.08;
    const serviceCharge = totalAmount * 0.1;
    const finalAmount = totalAmount + tax + serviceCharge;
    
    // Create order
    const newOrder = {
      id: orders.length + 1,
      orderNumber: `ORD-${Date.now()}`,
      tableId: parseInt(tableId),
      tableNumber: table.number,
      items: items.map(item => ({
        ...item,
        quantity: item.quantity || 1
      })),
      totalAmount,
      tax,
      serviceCharge,
      finalAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };
    
    orders.push(newOrder);
    
    // Update table status
    const tableIndex = tables.findIndex(t => t.id === parseInt(tableId));
    tables[tableIndex].status = 'occupied';
    
    res.status(201).json({
      success: true,
      order: newOrder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Split Bill
app.post('/api/split-bill', authenticateToken, (req, res) => {
  try {
    const { orderId, splitType, people } = req.body;
    
    // Find order
    const order = orders.find(o => o.id === parseInt(orderId));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const total = order.finalAmount;
    let splitPeople = [];
    
    if (splitType === 'equal') {
      const perPerson = total / people.length;
      splitPeople = people.map(person => ({
        ...person,
        amount: perPerson
      }));
    } else {
      // Custom split (simplified)
      splitPeople = people;
    }
    
    // Create payments
    const paymentRecords = splitPeople.map(person => ({
      id: payments.length + 1,
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      personName: person.name,
      amount: person.amount || (total / people.length),
      paymentMethod: person.paymentMethod || 'online',
      status: person.paymentMethod === 'cash' ? 'pending' : 'pending',
      splitType: splitType,
      createdAt: new Date().toISOString()
    }));
    
    payments.push(...paymentRecords);
    
    res.json({
      success: true,
      splitDetails: splitPeople,
      payments: paymentRecords,
      qrCodes: paymentRecords
        .filter(p => p.paymentMethod === 'online')
        .map(p => ({
          personName: p.personName,
          amount: p.amount,
          qrData: `Payment for Table ${order.tableNumber} - ${p.personName}: $${p.amount}`
        }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Get Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const todayRevenue = payments
      .filter(p => {
        const paymentDate = p.createdAt.split('T')[0];
        return p.status === 'completed' && paymentDate === today;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    
    res.json({
      success: true,
      stats: {
        todayRevenue: parseFloat(todayRevenue.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        occupiedTables,
        pendingPayments,
        totalOrders: orders.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Get Payments
app.get('/api/payments', authenticateToken, (req, res) => {
  res.json({
    success: true,
    payments
  });
});

// 8. Complete Payment
app.post('/api/payments/complete', authenticateToken, (req, res) => {
  try {
    const { paymentIds } = req.body;
    
    paymentIds.forEach(paymentId => {
      const paymentIndex = payments.findIndex(p => p.id === parseInt(paymentId));
      if (paymentIndex !== -1) {
        payments[paymentIndex].status = 'completed';
        payments[paymentIndex].completedAt = new Date().toISOString();
      }
    });
    
    res.json({
      success: true,
      message: 'Payments marked as completed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    dataCounts: {
      users: users.length,
      tables: tables.length,
      menuItems: menuItems.length,
      orders: orders.length,
      payments: payments.length
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Admin Login: admin@restaurant.com / admin123`);
});
