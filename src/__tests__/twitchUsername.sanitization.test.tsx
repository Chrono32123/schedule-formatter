import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect } from 'vitest';
import App from '../App';

it('sanitizes input by removing invalid characters and trimming whitespace', () => {
  render(<App />);
  const twitchInput = screen.getByLabelText(/Your Twitch Username/i) as HTMLInputElement;

  fireEvent.change(twitchInput, { target: { value: '  bad!user# name_ ' } });
  expect(twitchInput.value).toBe('baduser name_');
});

it('allows underscores, numbers and spaces and trims surrounding whitespace', () => {
  render(<App />);
  const twitchInput = screen.getByLabelText(/Your Twitch Username/i) as HTMLInputElement;

  fireEvent.change(twitchInput, { target: { value: '  user_name 123  ' } });
  expect(twitchInput.value).toBe('user_name 123');
});

it('removes emoji and other non-ASCII/special characters', () => {
  render(<App />);
  const twitchInput = screen.getByLabelText(/Your Twitch Username/i) as HTMLInputElement;

  fireEvent.change(twitchInput, { target: { value: '😀emoji_user!' } });
  expect(twitchInput.value).toBe('emoji_user');
});