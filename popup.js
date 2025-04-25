document.addEventListener('DOMContentLoaded', function () {
	let allFontData = null
	const fontListContainer = document.getElementById('fontList')
	const fontsList = document.getElementById('fonts')
	const elementsContainer = document.getElementById('elementsContainer')
	const elementsTitle = document.getElementById('elementsTitle')
	const elementsList = document.getElementById('elements')
	const backButton = document.getElementById('backButton')
	const loadingMessage = document.getElementById('loading')

	// Get active tab
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		const activeTab = tabs[0]

		// Execute content script
		chrome.scripting.executeScript(
			{
				target: { tabId: activeTab.id },
				function: detectFonts
			},
			function (results) {
				if (chrome.runtime.lastError) {
					loadingMessage.textContent = 'Cannot run on this page.'
					return
				}

				// Get results
				allFontData = results[0].result

				// Hide loading message
				loadingMessage.style.display = 'none'
				fontListContainer.style.display = 'block'

				// Show font list
				if (Object.keys(allFontData).length === 0) {
					fontsList.innerHTML = '<li>No fonts found on this page.</li>'
					return
				}

				// Sort font data (by usage count in descending order)
				const sortedFonts = Object.entries(allFontData)
					.sort((a, b) => b[1].count - a[1].count)
					.map(([fontFamily, data]) => {
						const li = document.createElement('li')
						li.innerHTML = `<span class="font-name">${fontFamily}</span><span class="count">(${data.count} times)</span>`
						li.addEventListener('click', () => showElementsWithFont(fontFamily, data.elements))
						return li
					})

				// Add to DOM
				sortedFonts.forEach((li) => fontsList.appendChild(li))
			}
		)
	})

	// Function to show elements using a specific font
	function showElementsWithFont(fontFamily, elements) {
		// Hide font list and show elements container
		fontListContainer.style.display = 'none'
		elementsContainer.style.display = 'block'
		backButton.style.display = 'inline-block'

		// Update title
		elementsTitle.textContent = `Elements using "${fontFamily}":`

		// Clear previous elements
		elementsList.innerHTML = ''
		elementsList.scrollTo(0, 0)

		// Add elements to list
		elements.forEach((element, index) => {
			if (index < 50) {
				// Limit to 50 elements for performance
				const elementItem = document.createElement('div')
				elementItem.className = 'element-item'

				const truncatedContent =
					element.innerText.trim().substring(0, 100) + (element.innerText.length > 100 ? '...' : '')

				elementItem.innerHTML = `<span class="tag-name">${truncatedContent}</span>`

				const codeElement = document.createElement('code')
				codeElement.className = 'element-content'
				codeElement.title = element.outerHTML
				codeElement.textContent = element.outerHTML

				elementItem.appendChild(codeElement)

				elementsList.appendChild(elementItem)
			} else if (index === 50) {
				const moreInfo = document.createElement('div')
				moreInfo.innerText = `...and ${elements.length - 50} more elements`
				elementsList.appendChild(moreInfo)
			}
		})
	}

	// Back button functionality
	backButton.addEventListener('click', function () {
		elementsContainer.style.display = 'none'
		backButton.style.display = 'none'
		fontListContainer.style.display = 'block'
	})
})

// Function to detect all font families on the page
function detectFonts() {
	const fontFamilies = {}

	// Select all elements containing text
	const elements = document.querySelectorAll('body *')

	elements.forEach((element) => {
		if (element.childElementCount > 0) return // Skip elements with children
		if (element.tagName === 'SCRIPT') return // Skip script elements
		// Check if element contains text
		if (element.innerText && element.innerText.trim().length > 0) {
			// Get font-family value
			const computedStyle = window.getComputedStyle(element)
			const fontFamily = computedStyle.getPropertyValue('font-family')

			if (fontFamily) {
				// Multiple font families may be defined, split by comma and get each one
				const fonts = fontFamily.split(',').map((font) => font.trim().replace(/["']/g, ''))

				// Add font families to count
				fonts.forEach((font) => {
					if (!fontFamilies[font]) {
						fontFamilies[font] = {
							count: 1,
							elements: [
								{
									innerText: element.innerText.trim(),
									outerHTML: element.outerHTML
								}
							] // Elements info
						}
					} else {
						fontFamilies[font].count++
						// 100 elements per font (to avoid memory issues)
						if (fontFamilies[font].elements.length < 100) {
							fontFamilies[font].elements.push({
								innerText: element.innerText.trim(),
								outerHTML: element.outerHTML
							})
						}
					}
				})
			}
		}
	})

	return fontFamilies
}
