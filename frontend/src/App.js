import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Calendar, MapPin, Search, Users, Plus, Edit, Trash2, LogOut, User as UserIcon, UserCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('userToken'));

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      logout();
    }
  };

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('userToken', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('userToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

// Navigation Component
const Navigation = ({ isAdmin, onAdminLogout }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">E</div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">EventHive</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors" data-testid="nav-home">Home</Link>
            <Link to="/events" className="text-gray-700 hover:text-blue-600 font-medium transition-colors" data-testid="nav-events">Events</Link>
            
            {isAdmin ? (
              <Button onClick={onAdminLogout} variant="outline" size="sm" data-testid="admin-logout-button">
                <LogOut className="w-4 h-4 mr-2" />
                Admin Logout
              </Button>
            ) : user ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors" data-testid="nav-dashboard">My Events</Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="user-menu">
                      <UserCircle className="w-5 h-5" />
                      <span>{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" data-testid="nav-profile">Profile Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout} data-testid="user-logout-button">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/login" data-testid="nav-login">
                <Button variant="default" size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Home Page
const Home = () => {
  return (
    <div className="min-h-screen" data-testid="home-page">
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" data-testid="home-title">
              Welcome to EventHive
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto" data-testid="home-subtitle">
              Your smart event management platform. Discover, register, and manage events effortlessly.
            </p>
            <Link to="/events">
              <Button size="lg" className="rounded-full px-8" data-testid="browse-events-button">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 hover:shadow-lg transition-shadow" data-testid="feature-discover">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Discover Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Browse through a wide variety of events and find the ones that interest you.</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow" data-testid="feature-register">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Easy Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Register for events with just a few clicks. Login optional for tracking your events.</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow" data-testid="feature-manage">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-pink-600" />
              </div>
              <CardTitle>Track Your Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View and manage all your registered events in one place.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// User Login/Signup Page
const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const response = await axios.post(`${API}${endpoint}`, formData);
      login(response.data.token, response.data);
      toast.success(isLogin ? 'Login successful!' : 'Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12" data-testid="login-page">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="login-title">{isLogin ? 'Login' : 'Create Account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Welcome back! Login to manage your events' : 'Sign up to track and manage your event registrations'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                  data-testid="signup-name-input"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="login-password-input"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Events Page
const Events = () => {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '' });

  useEffect(() => {
    fetchEvents();
    if (user) {
      setRegisterForm({ name: user.name, email: user.email });
    }
  }, [user]);

  const fetchEvents = async (searchQuery = '') => {
    try {
      setLoading(true);
      const url = searchQuery ? `${API}/events?search=${searchQuery}` : `${API}/events`;
      const response = await axios.get(url);
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEvents(search);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/register`, {
        event_id: selectedEvent.id,
        name: registerForm.name,
        email: registerForm.email
      }, { headers });
      toast.success('Successfully registered for the event!');
      setSelectedEvent(null);
      if (!user) {
        setRegisterForm({ name: '', email: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="events-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8" data-testid="events-page-title">Upcoming Events</h1>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search events by name, location, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
              data-testid="search-events-input"
            />
            <Button type="submit" data-testid="search-events-button">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12" data-testid="loading-events">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500" data-testid="no-events">No events found</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow" data-testid={`event-card-${event.id}`}>
                <CardHeader>
                  <CardTitle data-testid={`event-name-${event.id}`}>{event.name}</CardTitle>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center text-sm" data-testid={`event-date-${event.id}`}>
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm" data-testid={`event-location-${event.id}`}>
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.location}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 line-clamp-3" data-testid={`event-description-${event.id}`}>{event.description}</p>
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedEvent(event)} data-testid={`register-button-${event.id}`}>
                        Register Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-testid="register-dialog">
                      <DialogHeader>
                        <DialogTitle>Register for {selectedEvent?.name}</DialogTitle>
                        <DialogDescription>
                          Fill in your details to register for this event.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleRegister}>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={registerForm.name}
                              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                              required
                              data-testid="register-name-input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={registerForm.email}
                              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                              required
                              data-testid="register-email-input"
                            />
                          </div>
                          {!user && (
                            <p className="text-sm text-gray-600">
                              Tip: <Link to="/login" className="text-blue-600 hover:underline">Login</Link> to track your registrations
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button type="submit" data-testid="register-submit-button">Complete Registration</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// User Dashboard
const UserDashboard = () => {
  const { token } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/user/registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrations(response.data);
    } catch (error) {
      toast.error('Failed to fetch registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (registrationId) => {
    if (!window.confirm('Are you sure you want to cancel this registration?')) return;
    try {
      await axios.delete(`${API}/registrations/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Registration cancelled successfully');
      fetchRegistrations();
    } catch (error) {
      toast.error('Failed to cancel registration');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="user-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8" data-testid="dashboard-title">My Registered Events</h1>

        {loading ? (
          <div className="text-center py-12">Loading your events...</div>
        ) : registrations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven't registered for any events yet</p>
              <Link to="/events">
                <Button>Browse Events</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registrations.map((reg) => (
              <Card key={reg.id} className="hover:shadow-lg transition-shadow" data-testid={`registration-card-${reg.id}`}>
                <CardHeader>
                  <CardTitle data-testid={`registration-event-name-${reg.id}`}>{reg.event.name}</CardTitle>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(reg.event.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2" />
                      {reg.event.location}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 line-clamp-3">{reg.event.description}</p>
                  <p className="text-sm text-gray-500 mt-4">
                    Registered: {new Date(reg.registered_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={() => handleCancelRegistration(reg.id)}
                    data-testid={`cancel-registration-${reg.id}`}
                  >
                    Cancel Registration
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Profile Page
const ProfilePage = () => {
  const { user, token, login } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name, email: user.email });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.put(`${API}/auth/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      login(token, response.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="profile-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Profile Settings</CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="profile-name-input"
                />
              </div>
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="profile-email-input"
                />
              </div>
              <Button type="submit" disabled={loading} data-testid="profile-submit">
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Admin Login
const AdminLogin = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/admin/login`, credentials);
      toast.success('Admin login successful!');
      localStorage.setItem('adminLoggedIn', 'true');
      navigate('/admin');
    } catch (error) {
      toast.error('Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" data-testid="admin-login-page">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="admin-login-title">Admin Login</CardTitle>
          <CardDescription>Enter admin credentials to access dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                required
                data-testid="admin-username-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
                data-testid="admin-password-input"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="admin-login-submit">
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <p className="text-sm text-gray-500 mt-4 text-center">Default: admin / admin123</p>
          <p className="text-xs text-gray-400 mt-2 text-center">Press Ctrl+Shift+A anywhere to access this page</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Admin Dashboard (unchanged from before)
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', date: '', location: '', description: '' });

  useEffect(() => {
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
      navigate('/admin/login');
      return;
    }
    fetchEvents();
  }, [navigate]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
      
      const regCounts = {};
      for (const event of response.data) {
        const regResponse = await axios.get(`${API}/registrations/${event.id}`);
        regCounts[event.id] = regResponse.data.count;
      }
      setRegistrations(regCounts);
    } catch (error) {
      toast.error('Failed to fetch events');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/events`, eventForm);
      toast.success('Event created successfully!');
      setShowCreateDialog(false);
      setEventForm({ name: '', date: '', location: '', description: '' });
      fetchEvents();
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/events/${editingEvent.id}`, eventForm);
      toast.success('Event updated successfully!');
      setEditingEvent(null);
      setEventForm({ name: '', date: '', location: '', description: '' });
      fetchEvents();
    } catch (error) {
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await axios.delete(`${API}/events/${eventId}`);
      toast.success('Event deleted successfully!');
      fetchEvents();
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const startEdit = (event) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      date: event.date,
      location: event.location,
      description: event.description
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" data-testid="admin-dashboard-title">Admin Dashboard</h1>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="create-event-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="create-event-dialog">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Event Name</Label>
                    <Input
                      id="name"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      required
                      data-testid="create-event-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      required
                      data-testid="create-event-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      required
                      data-testid="create-event-location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      required
                      data-testid="create-event-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="create-event-submit">Create Event</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {editingEvent && (
          <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
            <DialogContent data-testid="edit-event-dialog">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateEvent}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="edit-name">Event Name</Label>
                    <Input
                      id="edit-name"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      required
                      data-testid="edit-event-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      required
                      data-testid="edit-event-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      required
                      data-testid="edit-event-location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      required
                      data-testid="edit-event-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="edit-event-submit">Update Event</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="events-table">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} data-testid={`event-row-${event.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium" data-testid={`table-event-name-${event.id}`}>{event.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`table-event-date-${event.id}`}>{new Date(event.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`table-event-location-${event.id}`}>{event.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`table-event-registrations-${event.id}`}>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {registrations[event.id] || 0} registered
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(event)} data-testid={`edit-button-${event.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteEvent(event.id)} data-testid={`delete-button-${event.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && (
            <div className="text-center py-8 text-gray-500" data-testid="no-events-admin">No events created yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Route for authenticated users
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Main App Component
function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsAdmin(localStorage.getItem('adminLoggedIn') === 'true');

    // Keyboard shortcut listener for Ctrl+Shift+A
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/admin/login');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const handleAdminLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    setIsAdmin(false);
    navigate('/');
  };

  return (
    <div className="App">
      <Navigation isAdmin={isAdmin} onAdminLogout={handleAdminLogout} />
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

// Wrap App with AuthProvider
export default function AppWrapper() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}
