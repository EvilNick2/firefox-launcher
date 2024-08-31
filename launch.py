import tkinter as tk
import base64
import os
import subprocess
import sv_ttk
import requests
import platform
import re
from tkinter import ttk
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from PIL import Image, ImageTk
from io import BytesIO

if platform.system() == "Windows":
	app = "C:\\Program Files\\Mozilla Firefox\\firefox.exe"
	profilesPath = os.path.expandvars("%APPDATA%\\Mozilla\\Firefox\\Profiles")
	pathToKey = os.path.expandvars("%APPDATA%\\Mozilla\\Firefox\\OLE")
elif platform.system() == "Linux":
	app = "/usr/bin/firefox"
	profilesPath = os.path.expandvars("$HOME/.mozilla/firefox")
	pathToKey = os.path.expandvars("$HOME/.mozilla/firefox/OLE")
else:
	print("Your operating system isn't supported")

def download_firefox_icon(save_path):
		if os.path.exists(save_path):
				print(f"Icon already exists at {save_path}")
				return

		# URL of the Firefox icon
		url = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Firefox_logo%2C_2019.svg/1920px-Firefox_logo%2C_2019.svg.png"
		
		# Send a GET request to the URL
		response = requests.get(url)
		
		# Check if the request was successful
		if response.status_code == 200:
				# Open the image from the response content
				image = Image.open(BytesIO(response.content))
				
				# Save the image to the specified path
				image.save(save_path, format='PNG')
				print(f"Icon saved to {save_path}")
		else:
				print(f"Failed to download icon. Status code: {response.status_code}")

def password(pwd):
	pwdEncrypt = pwd.encode()
	kdf = PBKDF2HMAC(
		algorithm=hashes.SHA256(),
		length=32,
		salt="B&x3P4EC2&UD5Wlb".encode(),
		iterations=1024,
		backend=default_backend()
	)
	key = base64.urlsafe_b64encode(kdf.derive(pwdEncrypt))
	return key

def detectProfiles():
    profiles = []
    pattern = re.compile(r'^[a-zA-Z0-9]{8}\.(.+)$')
    
    for dir_name in os.listdir(profilesPath):
        match = pattern.match(dir_name)
        if match:
            profile_name = match.group(1)
            if profile_name != "default-release":
                profiles.append(profile_name)
    
    return profiles

def generate_buttons(root, strings, image_paths, uuids):
		for string, image_path, uuid in zip(strings, image_paths, uuids):
				# Load the image
				image = Image.open(image_path)

				# Resize the image
				image = image.resize((128, 128), Image.BICUBIC)

				photo = ImageTk.PhotoImage(image)

				# Add spaces to the beginning of the text
				padded_string = '   ' + string

				# Create the button with the configured style
				button = ttk.Button(root, text=padded_string, image=photo, compound='left', style='TButton')

				# Set the command to launch the application with the common arguments and the profile UUID
				button.config(command=lambda uuid=uuid: launch_profile(app, uuid))

				button.image = photo  # Keep a reference to the image
				button.pack(pady=5)  # Add vertical padding

def launch_profile(app, uuid):
		print(f"Launching profile: {uuid}")
		subprocess.run([app, '-new-instance', '-P', uuid])

def create_new_screen(size=None):
		# Destroy the current window
		root.destroy()

		# Create a new window
		new_root = tk.Tk()
		new_root.title("Firefox Launcher")

		if size == "fullscreen":
				new_root.state("zoomed")

		firefoxProfiles = detectProfiles()

		# List of strings
		strings = firefoxProfiles

		icon_path = f"{pathToKey}\\firefox.png"
		try:
				download_firefox_icon(icon_path)
				image_paths = [icon_path] * len(strings)
		except FileNotFoundError as e:
				print(e)
				image_paths = []

		# List of profile UUIDs
		uuids = firefoxProfiles
		print(uuids)

		sv_ttk.set_theme("dark")
		# Create a style
		style = ttk.Style()

		# Configure the style
		style.configure('TButton', font=("Helvetica", 20))

		generate_buttons(new_root, strings, image_paths, uuids)

		new_root.mainloop()

def compare_password(event=None):  # removed the event parameter
		entered_password = password(password_input.get())
		with open(f"{pathToKey}\\key.ole", "rb") as file:
			stored_password = file.read()
		if entered_password == stored_password:
				result_text.set("Password is correct")
				create_new_screen("fullscreen")
		else:
				result_text.set("Password is incorrect")


# Create the root window
root = tk.Tk()
root.title("Password Check")
root.configure(bg="#1c1c1c")

# Create a frame to hold the password input field and check button
input_frame = tk.Frame(root)
input_frame.pack(side="top", pady=(20, 10))

def create_password_file():
		new_window = tk.Toplevel(root, bg="#1c1c1c")
		new_window.title("Create Password File")
		new_window_frame = tk.Frame(new_window)
		new_window_frame.pack(side="top")
		

		instruction_label = tk.Label(new_window, text="Password file not found. Please enter a new password:", bg="#1c1c1c", fg="#fafafa")
		instruction_label.pack(side='top')

		new_password_input = ttk.Entry(new_window, show="*", foreground="#fafafa")
		new_password_input.pack(side='left')

		def save_new_password(event=None):
				with open(f"{pathToKey}\\key.ole", "wb") as file:
						file.write(password(new_password_input.get()))
				print('Password file created')
				new_window.destroy()

		save_button = ttk.Button(new_window, text="Save Password", command=save_new_password)
		save_button.pack(side='left')

		# Bind the Enter key to the save_new_password function
		new_window.bind('<Return>', save_new_password)

		sv_ttk.set_theme("dark")

		root.wait_window(new_window)

root.withdraw()

if not os.path.exists(pathToKey):
		os.mkdir(pathToKey)
if not os.path.isfile(f"{pathToKey}\\key.ole"):
		create_password_file()
else:
		print('Password file already exists')

# Show the main window
root.deiconify()

# Create a new password input field
password_input = ttk.Entry(input_frame, show="*")
password_input.pack(side='left')

# Button to check the password
check_button = ttk.Button(input_frame, text="Check Password", command=compare_password)
check_button.pack(side='left')

# Bind the Enter key to the compare_password function
root.bind('<Return>', compare_password)

# Create a StringVar to hold the result text
result_text = tk.StringVar()

# Create a label to display the result text
result_label = tk.Label(root, textvariable=result_text)
result_label.pack(side='top')

# Set focus to the password input field
password_input.focus_set()

sv_ttk.set_theme("dark")

root.mainloop()