import { AppInfo, AppName } from '../types';

export const SUPPORTED_APPS: Record<AppName, AppInfo> = {
  WhatsApp: {
    name: 'WhatsApp',
    displayName: 'WhatsApp',
    color: '#25D366',
    iconName: 'MessageSquare',
    defaultSender: 'Jessica Martinez',
    defaultBody: 'Hey! Are we still meeting for coffee at 2 PM today?',
  },
  Gmail: {
    name: 'Gmail',
    displayName: 'Gmail',
    color: '#EA4335',
    iconName: 'Mail',
    defaultSender: 'Google Security',
    defaultBody: 'New sign-in detected on your Android device.',
  },
  Slack: {
    name: 'Slack',
    displayName: 'Slack',
    color: '#4A154B',
    iconName: 'Slack',
    defaultSender: 'David (PM)',
    defaultBody: 'Can you review the design slides before the client demo?',
  },
  Discord: {
    name: 'Discord',
    displayName: 'Discord',
    color: '#5865F2',
    iconName: 'Compass',
    defaultSender: 'GamerGroup #general',
    defaultBody: 'Are we jumping on the voice channel tonight?',
  },
  Calendar: {
    name: 'Calendar',
    displayName: 'Google Calendar',
    color: '#4285F4',
    iconName: 'Calendar',
    defaultSender: 'Event Alert',
    defaultBody: 'Upcoming Event: Project Sync in 15 minutes.',
  },
  System: {
    name: 'System',
    displayName: 'Android System',
    color: '#3DDC84',
    iconName: 'Cpu',
    defaultSender: 'Battery Care',
    defaultBody: 'Phone is fully charged. Unplug charger to save energy.',
  },
};

export const MOCK_SENDER_MESSAGES: Record<AppName, { sender: string; body: string }[]> = {
  WhatsApp: [
    { sender: 'Mom ❤️', body: 'Let me know when you arrive home!' },
    { sender: 'Alex (Design)', body: 'Sent you the high-fidelity mockups.' },
    { sender: 'Pizza Delivery', body: 'Your order has been picked up!' },
  ],
  Gmail: [
    { sender: 'Netflix', body: 'New arrival: Season 3 is streaming now!' },
    { sender: 'LinkedIn', body: '3 people viewed your profile this week.' },
    { sender: 'GitHub', body: '[Pull Request] Merged branch main into dev.' },
  ],
  Slack: [
    { sender: 'Sarah (HR)', body: 'Please submit your timesheet by EOD.' },
    { sender: 'Marketing Bot', body: 'Daily standup is starting in 5 minutes!' },
    { sender: 'John Doe', body: 'Sent you a direct message.' },
  ],
  Discord: [
    { sender: 'MemeLord', body: 'Check out this funny audio clip!' },
    { sender: 'Apex Legends Guild', body: 'Tournament registrations are now open.' },
    { sender: 'Music Bot', body: 'Now playing: Lofi Beats to Study/Relax To.' },
  ],
  Calendar: [
    { sender: 'Dentist Appointment', body: 'Dr. Smith - 4:30 PM tomorrow.' },
    { sender: 'Lunch with Emily', body: 'Confirmed for 12:30 PM at Bistro.' },
    { sender: 'Gym Time', body: 'Scheduled daily workout reminder.' },
  ],
  System: [
    { sender: 'Google Play', body: 'Successfully updated 12 applications.' },
    { sender: 'Android Security', body: 'Monthly security scan completed. No threats found.' },
    { sender: 'Storage Manager', body: 'Freed up 2.4 GB of temporary cache files.' },
  ],
};
