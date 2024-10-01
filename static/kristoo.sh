#!/bin/bash

# Script Name: kristoo.sh
# Author: Kris Yotam
# Description: A script to pull dotfiles and install applications based on progs.csv

# Define variables
DOTFILES_REPO="https://github.com/krisyotam/dotfiles"
PROGS_CSV="progs.csv"

# Function to install packages based on the progs.csv file
install_packages() {
    while IFS=, read -r category package
    do
        case "$category" in
            "gentoo")
                echo "Installing $package on Gentoo..."
                sudo emerge --ask "$package"
                ;;
            "apt")
                echo "Installing $package on Debian/Ubuntu..."
                sudo apt install -y "$package"
                ;;
            "snap")
                echo "Installing $package using Snap..."
                sudo snap install "$package"
                ;;
            *)
                echo "Unknown category: $category for package $package. Skipping."
                ;;
        esac
    done < "$PROGS_CSV"
}

# Clone the dotfiles repository
echo "Cloning dotfiles repository..."
git clone "$DOTFILES_REPO" ~/dotfiles

# Symlink dotfiles to the home directory
echo "Setting up dotfiles..."
ln -sf ~/dotfiles/.bashrc ~/.bashrc
ln -sf ~/dotfiles/.vimrc ~/.vimrc
# Add more symlinks as needed

# Install packages
install_packages

echo "Setup complete!"
