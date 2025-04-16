// Global Variables
let slides = [{
    id: 1,
    content: '<div class="editable" contenteditable="true">Click to add title</div><div class="editable" contenteditable="true">Click to add content</div>'
}];
let currentSlideIndex = 0;
let undoStack = [];
let redoStack = [];

// DOM Elements
const slideNavigator = document.getElementById('slideNavigator');
const currentSlide = document.getElementById('currentSlide');
const slideContent = document.getElementById('slideContent');
const slideInfo = document.getElementById('slideInfo');
const presentationMode = document.getElementById('presentationMode');
const presentationSlide = document.getElementById('presentationSlide');
const toast = document.getElementById('toast');

// Initialize app
function init() {
    renderSlides();
    setupEventListeners();
    setupDragAndDrop();
    checkForSavedData();
}

// Check for saved presentations in local storage
function checkForSavedData() {
    const savedPresentations = localStorage.getItem('savedPresentations');
    if (savedPresentations) {
        const presentations = JSON.parse(savedPresentations);
        if (presentations.length > 0) {
            showRecentPresentations(presentations);
        }
    }
}

// Show recent presentations dialog
function showRecentPresentations(presentations) {
    const recentDialog = document.getElementById('recentDialog');
    const recentList = document.getElementById('recentList');
    
    recentList.innerHTML = '';
    presentations.forEach(presentation => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <span>${presentation.name}</span>
            <div>
                <button class="small-button" onclick="loadPresentation('${presentation.id}')">Open</button>
                <button class="small-button danger" onclick="deletePresentation('${presentation.id}')">Delete</button>
            </div>
        `;
        recentList.appendChild(item);
    });
    
    recentDialog.style.display = 'flex';
}

// Load a saved presentation from local storage
function loadPresentation(id) {
    const savedPresentations = JSON.parse(localStorage.getItem('savedPresentations') || '[]');
    const presentation = savedPresentations.find(p => p.id === id);
    
    if (presentation) {
        slides = JSON.parse(presentation.slides);
        currentSlideIndex = 0;
        renderSlides();
        document.getElementById('recentDialog').style.display = 'none';
        showToast('Presentation loaded successfully');
    }
}

// Delete a saved presentation
function deletePresentation(id) {
    let savedPresentations = JSON.parse(localStorage.getItem('savedPresentations') || '[]');
    savedPresentations = savedPresentations.filter(p => p.id !== id);
    localStorage.setItem('savedPresentations', JSON.stringify(savedPresentations));
    
    // Update the list
    showRecentPresentations(savedPresentations);
    showToast('Presentation deleted');
}

// Close the recent presentations dialog
function closeRecentDialog() {
    document.getElementById('recentDialog').style.display = 'none';
}

// Render slide thumbnails
function renderSlides() {
    // Save the current slide content first
    if (slides[currentSlideIndex]) {
        slides[currentSlideIndex].content = slideContent.innerHTML;
    }
    
    slideNavigator.innerHTML = '';
    slides.forEach((slide, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `slide-thumbnail ${index === currentSlideIndex ? 'active' : ''}`;
        thumbnail.setAttribute('draggable', 'true');
        thumbnail.setAttribute('data-index', index);
        
        // Create a mini preview of the slide content
        const previewContent = slide.content.replace(/<div class="editable"[^>]*>(.*?)<\/div>/g, '<div class="preview-text">$1</div>');
        
        thumbnail.innerHTML = `
            <div class="slide-number">Slide ${index + 1}</div>
            <div class="thumbnail-preview">${previewContent}</div>
        `;
        thumbnail.onclick = () => switchSlide(index);
        slideNavigator.appendChild(thumbnail);
    });
    
    // Update current slide
    slideContent.innerHTML = slides[currentSlideIndex].content;
    
    // Update slide info
    slideInfo.textContent = `Slide ${currentSlideIndex + 1} of ${slides.length}`;
}

// Set up drag and drop for slide reordering
function setupDragAndDrop() {
    let draggedItem = null;
    
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('slide-thumbnail')) {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.style.opacity = '0.5';
            }, 0);
        }
    });
    
    document.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('slide-thumbnail')) {
            e.target.style.opacity = '1';
        }
    });
    
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        if (e.target.classList.contains('slide-thumbnail') && draggedItem) {
            const fromIndex = parseInt(draggedItem.getAttribute('data-index'));
            const toIndex = parseInt(e.target.getAttribute('data-index'));
            
            // Save state for undo
            saveState();
            
            // Reorder slides
            const movedSlide = slides.splice(fromIndex, 1)[0];
            slides.splice(toIndex, 0, movedSlide);
            
            // Update current slide index if necessary
            if (currentSlideIndex === fromIndex) {
                currentSlideIndex = toIndex;
            } else if (currentSlideIndex > fromIndex && currentSlideIndex <= toIndex) {
                currentSlideIndex--;
            } else if (currentSlideIndex < fromIndex && currentSlideIndex >= toIndex) {
                currentSlideIndex++;
            }
            
            renderSlides();
        }
    });
}

// Switch to a different slide
function switchSlide(index) {
    // Save current slide content
    slides[currentSlideIndex].content = slideContent.innerHTML;
    
    // Switch to new slide
    currentSlideIndex = index;
    slideContent.innerHTML = slides[currentSlideIndex].content;
    
    // Update UI
    renderSlides();
}

// Create a new slide
function createNewSlide() {
    // Save current slide content
    slides[currentSlideIndex].content = slideContent.innerHTML;
    
    // Save state for undo
    saveState();
    
    // Create new slide
    const newSlide = {
        id: Date.now(), // Using timestamp as ID
        content: '<div class="editable" contenteditable="true">Click to add title</div><div class="editable" contenteditable="true">Click to add content</div>'
    };
    
    // Add to slides array
    slides.splice(currentSlideIndex + 1, 0, newSlide);
    
    // Switch to new slide
    currentSlideIndex = currentSlideIndex + 1;
    
    // Update UI
    renderSlides();
    showToast('New slide created');
}

// Duplicate current slide
function duplicateSlide() {
    // Save current slide content
    slides[currentSlideIndex].content = slideContent.innerHTML;
    
    // Save state for undo
    saveState();
    
    // Create duplicate slide
    const duplicatedSlide = {
        id: Date.now(),
        content: slides[currentSlideIndex].content
    };
    
    // Add to slides array
    slides.splice(currentSlideIndex + 1, 0, duplicatedSlide);
    
    // Switch to new slide
    currentSlideIndex = currentSlideIndex + 1;
    
    // Update UI
    renderSlides();
    showToast('Slide duplicated');
}

// Delete current slide
function deleteSlide() {
    // Don't delete if it's the only slide
    if (slides.length === 1) {
        showToast('Cannot delete the only slide', 'error');
        return;
    }
    
    // Save state for undo
    saveState();
    
    // Remove current slide
    slides.splice(currentSlideIndex, 1);
    
    // Adjust current index if needed
    if (currentSlideIndex >= slides.length) {
        currentSlideIndex = slides.length - 1;
    }
    
    // Update UI
    renderSlides();
    showToast('Slide deleted');
}

// Enter presentation mode
function enterPresentationMode() {
    // Save current slide content
    slides[currentSlideIndex].content = slideContent.innerHTML;
    
    // Show presentation mode
    presentationMode.style.display = 'flex';
    document.body.classList.add('presenting');
    
    // Show current slide
    showPresentationSlide(currentSlideIndex);
}

// Exit presentation mode
function exitPresentationMode() {
    presentationMode.style.display = 'none';
    document.body.classList.remove('presenting');
}

// Show slide in presentation mode
function showPresentationSlide(index) {
    presentationSlide.innerHTML = slides[index].content;
    
    // Disable editing
    const editables = presentationSlide.querySelectorAll('.editable');
    editables.forEach(el => {
        el.contentEditable = false;
    });
    
    // Update slide counter
    document.getElementById('slideCounter').textContent = `${index + 1} / ${slides.length}`;
}

// Navigate in presentation mode
function nextSlide() {
    if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        showPresentationSlide(currentSlideIndex);
    }
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        showPresentationSlide(currentSlideIndex);
    }
}

// Apply text formatting
function applyFormatting(command, value = null) {
    document.execCommand(command, false, value);
    
    // Update button states
    updateFormatButtonStates();
}

// Update format button states based on current selection
function updateFormatButtonStates() {
    document.getElementById('boldBtn').classList.toggle('active', document.queryCommandState('bold'));
    document.getElementById('italicBtn').classList.toggle('active', document.queryCommandState('italic'));
    document.getElementById('underlineBtn').classList.toggle('active', document.queryCommandState('underline'));
    
    // Update font and size selects (more complex)
    const fontName = document.queryCommandValue('fontName');
    const fontSize = document.queryCommandValue('fontSize');
    
    if (fontName) {
        const fontSelect = document.getElementById('fontSelect');
        try {
            fontSelect.value = fontName;
        } catch (e) {
            // Font not in list
        }
    }
    
    if (fontSize) {
        const sizeSelect = document.getElementById('sizeSelect');
        try {
            sizeSelect.value = fontSize + 'px';
        } catch (e) {
            // Size not in list
        }
    }
}

// Save state for undo/redo
function saveState() {
    // Save current content to the slide before capturing state
    slides[currentSlideIndex].content = slideContent.innerHTML;
    
    undoStack.push({
        slides: JSON.parse(JSON.stringify(slides)),
        currentSlideIndex: currentSlideIndex
    });
    
    // Clear redo stack when a new action is performed
    redoStack = [];
    
    // Enable/disable undo/redo buttons
    updateUndoRedoButtons();
}

// Undo last action
function undo() {
    if (undoStack.length === 0) return;
    
    // Save current state to redo stack
    redoStack.push({
        slides: JSON.parse(JSON.stringify(slides)),
        currentSlideIndex: currentSlideIndex
    });
    
    // Restore previous state
    const previousState = undoStack.pop();
    slides = previousState.slides;
    currentSlideIndex = previousState.currentSlideIndex;
    
    // Update UI
    renderSlides();
    updateUndoRedoButtons();
    showToast('Undo successful');
}

// Redo previously undone action
function redo() {
    if (redoStack.length === 0) return;
    
    // Save current state to undo stack
    undoStack.push({
        slides: JSON.parse(JSON.stringify(slides)),
        currentSlideIndex: currentSlideIndex
    });
    
    // Restore next state
    const nextState = redoStack.pop();
    slides = nextState.slides;
    currentSlideIndex = nextState.currentSlideIndex;
    
    // Update UI
    renderSlides();
    updateUndoRedoButtons();
    showToast('Redo successful');
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = undoStack.length === 0;
    document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

// Export slides to JSON
function exportSlides() {
    // Save current slide content
    slides[currentSlideIndex].content = slideContent.innerHTML;
    
    // Create JSON data
    const jsonData = JSON.stringify(slides, null, 2);
    
    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create and click download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = prompt("Enter you file name: ") + '.presentation';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showToast('Presentation exported successfully');
}

// Import slides from JSON
function importSlides() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.presentation' || '.json';
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                // Save state for undo
                saveState();
                
                // Parse and validate JSON
                const importedSlides = JSON.parse(event.target.result);
                if (Array.isArray(importedSlides) && importedSlides.length > 0) {
                    slides = importedSlides;
                    currentSlideIndex = 0;
                    renderSlides();
                    showToast('Presentation imported successfully');
                } else {
                    showToast('Invalid presentation file format', 'error');
                }
            } catch (error) {
                showToast('Error importing presentation', 'error');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    };
    
    fileInput.click();
}

// Save presentation
function savePresentation() {
    // Save current slide content
    slides[currentSlideIndex].content = slideContent.innerHTML;
    
    // Prompt for presentation name
    document.getElementById('saveDialog').style.display = 'flex';
}

// Save presentation to local storage
function finalizeSave() {
    const nameInput = document.getElementById('presentationName');
    const name = nameInput.value.trim() || `Presentation ${new Date().toLocaleString()}`;
    
    // Get existing presentations
    let savedPresentations = JSON.parse(localStorage.getItem('savedPresentations') || '[]');
    
    // Create presentation object
    const presentation = {
        id: Date.now().toString(),
        name: name,
        date: new Date().toISOString(),
        slides: JSON.stringify(slides)
    };
    
    // Add to saved presentations
    savedPresentations.push(presentation);
    
    // Limit to 10 most recent
    if (savedPresentations.length > 10) {
        savedPresentations = savedPresentations.slice(-10);
    }
    
    // Save to local storage
    localStorage.setItem('savedPresentations', JSON.stringify(savedPresentations));
    
    // Close dialog and reset input
    document.getElementById('saveDialog').style.display = 'none';
    nameInput.value = '';
    
    showToast('Presentation saved successfully');
}

// Cancel saving
function cancelSave() {
    document.getElementById('saveDialog').style.display = 'none';
    document.getElementById('presentationName').value = '';
}

// Show recent presentations
function showRecent() {
    const savedPresentations = JSON.parse(localStorage.getItem('savedPresentations') || '[]');
    if (savedPresentations.length > 0) {
        showRecentPresentations(savedPresentations);
    } else {
        showToast('No saved presentations found', 'info');
    }
}

// Insert image
function insertImage() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = `<img src="${event.target.result}" class="slide-image" alt="Inserted Image">`;
            document.execCommand('insertHTML', false, img);
        };
        reader.readAsDataURL(file);
    };
    
    fileInput.click();
}

// Insert shape
function insertShape(type) {
    let shape;
    const color = document.getElementById('colorPicker').value;
    
    switch (type) {
        case 'rectangle':
            shape = `<div class="shape rectangle" style="background-color: ${color}"></div>`;
            break;
        case 'circle':
            shape = `<div class="shape circle" style="background-color: ${color}"></div>`;
            break;
        case 'triangle':
            shape = `<div class="shape triangle" style="border-bottom-color: ${color}"></div>`;
            break;
    }
    
    document.execCommand('insertHTML', false, shape);
}

// Show toast message
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Toolbar buttons
    document.getElementById('newSlideBtn').addEventListener('click', createNewSlide);
    document.getElementById('duplicateBtn').addEventListener('click', duplicateSlide);
    document.getElementById('deleteSlideBtn').addEventListener('click', deleteSlide);
    document.getElementById('presentBtn').addEventListener('click', enterPresentationMode);
    document.getElementById('exportBtn').addEventListener('click', exportSlides);
    document.getElementById('importBtn').addEventListener('click', importSlides);
    document.getElementById('saveBtn').addEventListener('click', savePresentation);
    document.getElementById('openBtn').addEventListener('click', showRecent);
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('insertImageBtn').addEventListener('click', insertImage);
    
    // Shape dropdown listeners
    document.getElementById('rectangleBtn').addEventListener('click', () => insertShape('rectangle'));
    document.getElementById('circleBtn').addEventListener('click', () => insertShape('circle'));
    document.getElementById('triangleBtn').addEventListener('click', () => insertShape('triangle'));
    
    // Dialog buttons
    document.getElementById('savePresentationBtn').addEventListener('click', finalizeSave);
    document.getElementById('cancelSaveBtn').addEventListener('click', cancelSave);
    document.getElementById('closeRecentBtn').addEventListener('click', closeRecentDialog);
    
    // Format toolbar
    document.getElementById('fontSelect').addEventListener('change', (e) => {
        applyFormatting('fontName', e.target.value);
    });
    
    document.getElementById('sizeSelect').addEventListener('change', (e) => {
        applyFormatting('fontSize', e.target.value);
    });
    
    document.getElementById('boldBtn').addEventListener('click', () => {
        applyFormatting('bold');
    });
    
    document.getElementById('italicBtn').addEventListener('click', () => {
        applyFormatting('italic');
    });
    
    document.getElementById('underlineBtn').addEventListener('click', () => {
        applyFormatting('underline');
    });
    
    document.getElementById('alignLeftBtn').addEventListener('click', () => {
        applyFormatting('justifyLeft');
    });
    
    document.getElementById('alignCenterBtn').addEventListener('click', () => {
        applyFormatting('justifyCenter');
    });
    
    document.getElementById('alignRightBtn').addEventListener('click', () => {
        applyFormatting('justifyRight');
    });
    
    document.getElementById('colorPicker').addEventListener('input', (e) => {
        applyFormatting('foreColor', e.target.value);
    });
    
    document.getElementById('bgColorPicker').addEventListener('input', (e) => {
        applyFormatting('hiliteColor', e.target.value);
    });
    
    // Listen for selection changes to update formatting buttons
    document.addEventListener('selectionchange', updateFormatButtonStates);
    
    // Presentation controls
    document.getElementById('exitPresentation').addEventListener('click', exitPresentationMode);
    document.getElementById('nextSlide').addEventListener('click', nextSlide);
    document.getElementById('prevSlide').addEventListener('click', prevSlide);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // In presentation mode
        if (presentationMode.style.display === 'flex') {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                nextSlide();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                exitPresentationMode();
                e.preventDefault();
            }
        } 
        // In editor mode
        else {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                savePresentation();
                e.preventDefault();
            }
            // Ctrl+Z to undo
            else if (e.ctrlKey && e.key === 'z') {
                undo();
                e.preventDefault();
            }
            // Ctrl+Y to redo
            else if (e.ctrlKey && e.key === 'y') {
                redo();
                e.preventDefault();
            }
            // Ctrl+N for new slide
            else if (e.ctrlKey && e.key === 'n') {
                createNewSlide();
                e.preventDefault();
            }
        }
    });
    
    // Toggle dropdown menus
    document.getElementById('insertBtn').addEventListener('click', () => {
        document.getElementById('insertDropdown').classList.toggle('show');
    });
    
    // Close dropdowns when clicking elsewhere
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.dropdown-button')) {
            const dropdowns = document.getElementsByClassName('dropdown-content');
            for (let i = 0; i < dropdowns.length; i++) {
                if (dropdowns[i].classList.contains('show')) {
                    dropdowns[i].classList.remove('show');
                }
            }
        }
    });
}

// Initialize the app
window.onload = init;