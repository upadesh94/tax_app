# Estate Tax Collection System

A modern React Native mobile application for managing property taxes and payments with real-time data integration.

## 🚀 Features

- **Property Management**: View and manage multiple properties
- **Tax Calculation**: Calculate property tax and income tax
- **Payment Processing**: Process payments and view history
- **Dark/Light Mode**: Toggle between themes
- **Real-time Data**: Supabase backend integration
- **Modern UI/UX**: Glassmorphic design with smooth animations

## 📱 Screenshots

- Home Dashboard with real-time stats
- Properties with tax details
- Tax calculators (Property & Income)
- Payment history and processing
- Profile with dark mode toggle

## 🛠️ Tech Stack

- **Frontend**: React Native 0.81.5
- **Framework**: Expo 54
- **Navigation**: React Navigation 6.x
- **Backend**: Supabase (PostgreSQL)
- **State Management**: React Context
- **Icons**: React Native SVG
- **Storage**: AsyncStorage

## 📦 Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (optional)

### Steps

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/tax_app.git
cd tax_app/app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on your device:
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `w` for web
   - Press `a` for Android emulator
   - Press `i` for iOS simulator

## 🔐 Demo Credentials

- **Email**: demo@test.com
- **Password**: demo123

## 📂 Project Structure

```
app/
├── src/
│   ├── config/          # API and Supabase configuration
│   ├── contexts/        # React Context (Auth, Theme)
│   ├── navigation/      # Navigation setup
│   └── screens/         # All app screens
├── assets/              # Images and icons
├── database/            # Database schema
├── App.js              # Main app component
└── package.json        # Dependencies
```

## 🎨 Screens

1. **Login/Register** - Authentication
2. **Home** - Dashboard with stats and recent activity
3. **Properties** - Property list with tax details
4. **Tax Calculator** - Property tax calculation
5. **Income Tax** - Income tax calculator (Indian tax slabs)
6. **Payments** - Payment history and processing
7. **Profile** - User profile and settings

## 🌙 Dark Mode

Toggle dark/light mode from the Profile screen:
- **Dark Mode**: Deep Space Blue theme
- **Light Mode**: White/Blue theme
- Theme preference persists across sessions

## 🗄️ Database

The app uses Supabase with the following tables:
- `users` - User accounts
- `properties` - Property information
- `taxes` - Tax records
- `payments` - Payment transactions
- `tax_rates` - Tax rate configurations
- `notifications` - User notifications

## 👤 User

**Name**: Aditya Barandwal  
**Email**: demo@test.com

## 🔧 Configuration

### Supabase Setup

1. Create a Supabase project
2. Run the SQL schema from `app/database/schema.sql`
3. Update `app/src/config/supabase.js` with your credentials:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_KEY'
```

## 📝 Available Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
```

## 🐛 Troubleshooting

### 500 Error
```bash
npm install
npx expo start --clear
```

### Theme not persisting
Make sure AsyncStorage is installed:
```bash
npm install @react-native-async-storage/async-storage
```

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For any queries, please contact: support@estatetax.gov.in

---

**Built with ❤️ using React Native and Expo**
