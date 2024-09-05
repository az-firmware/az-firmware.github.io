// Adapted from devanlai's dfu util

var auzaProducts = {};
var guides = [];
var guideProduct;
var forceConnectEnabled = false;
var device = null;
var auzaDevice = {
 	'detectedProduct': null,
	'detectedFirmwareV': null,
	'detectedFlashSize': null,
	'isBlankChip': false,
	'HasUpdated': false,
	'isDevVersion': false
}
var firmwareInfo = {};

function expandSection(event, sectionID){
	
	var content = document.getElementById(sectionID);
	if(content.style.maxHeight == '0px'){
	  content.style.maxHeight = '1200px';
	}
	else{
	  content.style.maxHeight = '0px';
	}

	var innerHTML = event.target.innerHTML;
	if(innerHTML.includes('►')){
		event.target.innerHTML = innerHTML.replace('►', '▼');
	} 
	else if(innerHTML.includes('▼')){
		event.target.innerHTML = innerHTML.replace('▼', '►');
	}
  }

function openTab(evt, tabNum, hyperlink){

	var tabLinks = document.getElementsByClassName('tab-link');
	if(!hyperlink){
		// Clear all tab statuses
		for (let i = 0; i < tabLinks.length; i++) {
			tabLinks[i].classList.remove('active-tab-link');
			tabLinks[i].classList.remove('inactive-tab-link');
		}	
		// Assign active to event element
		evt.currentTarget.classList.add('active-tab-link');
		// Assign inactive to all other elements
		for (let i = 0; i < tabLinks.length; i++) {
			if(!(tabLinks[i].classList.contains('active-tab-link'))){
				tabLinks[i].classList.add('inactive-tab-link');
			}
		}	

		if(tabNum == 1){
			document.getElementById('tab-connect-guide').style.display = 'block';
			document.getElementById('tab-firmware-tool').style.display = 'none';
		} else if(tabNum == 2){
			document.getElementById('tab-connect-guide').style.display = 'none';
			document.getElementById('tab-firmware-tool').style.display = 'block';
		}
	}
	else{
		// Clear all tab statuses
		for (let i = 0; i < tabLinks.length; i++) {
			tabLinks[i].classList.remove('active-tab-link');
			tabLinks[i].classList.remove('inactive-tab-link');
		}	
		// Assign active to tool tab
		document.getElementById('tool-tab').classList.add('active-tab-link');
		// Assign inactive to all other elements
		for (let i = 0; i < tabLinks.length; i++) {
			if(!(tabLinks[i].classList.contains('active-tab-link'))){
				tabLinks[i].classList.add('inactive-tab-link');
			}
		}	

		document.getElementById('tab-connect-guide').style.display = 'none';
		document.getElementById('tab-firmware-tool').style.display = 'block';
	}	
}

function updateGuideProduct(){
	let product = getDropdownSelected('select-product');

	if(product === 'Select Module:'){
		document.getElementsByClassName('guide')[0].style.display = 'none';
	}	
	else if(product !== guideProduct){
		guideProduct = product;

		let guideNum = 0;
		for(let i = 0; i<guides.length; i++){
			guides[i].element.style.display = 'none';
			if(product === guides[i].name){
				guideNum = i;
			}
		}	
		if(guides[guideNum].usesTool){
			document.getElementById('tool-compatibility').style.display = 'block';
		}	
		else{
			document.getElementById('tool-compatibility').style.display = 'none';
		}	
		guides[guideNum].element.style.display = 'block';
		document.getElementsByClassName('guide')[0].style.display = 'block';
	};				
};	


function setLatestBox(state){
	el= document.getElementById('latest-checkbox');
	if(state === 'checked'){
		el.classList.remove('latest-unchecked', 'latest-checked', 'latest-default');
		el.classList.add('latest-checked');
		el.firstElementChild.textContent = '✓';
	}
	else if(state === 'unchecked'){
		el.classList.remove('latest-unchecked', 'latest-checked', 'latest-default');
		el.classList.add('latest-unchecked')
		el.firstElementChild.textContent = '✕';
	}	
	else if(state === 'default'){
		el.classList.remove('latest-unchecked', 'latest-checked', 'latest-default');
		el.classList.add('latest-default')
		el.firstElementChild.textContent = '✕';
	}		
}

function getDFUDescriptorProperties(device) {
	return device.readConfigurationDescriptor(0).then(
		data => {
			let configDesc = dfu.parseConfigurationDescriptor(data);
			let funcDesc = null;
			let configValue = device.settings.configuration.configurationValue;
			if (configDesc.bConfigurationValue == configValue) {
				for (let desc of configDesc.descriptors) {
					if (desc.bDescriptorType == 0x21 && desc.hasOwnProperty('bcdDFUVersion')) {
						funcDesc = desc;
						break;
					}
				}
			}

			if (funcDesc) {
				return {
					WillDetach:            ((funcDesc.bmAttributes & 0x08) != 0),
					ManifestationTolerant: ((funcDesc.bmAttributes & 0x04) != 0),
					CanUpload:             ((funcDesc.bmAttributes & 0x02) != 0),
					CanDnload:             ((funcDesc.bmAttributes & 0x01) != 0),
					TransferSize:          funcDesc.wTransferSize,
					DetachTimeOut:         funcDesc.wDetachTimeOut,
					DFUVersion:            funcDesc.bcdDFUVersion
				};
			} else {
				return {};
			}
		},
		error => {
			throw error;
		}
	);
}

async function fixInterfaceNames(device_, interfaces) {
	// Check if any interface names were not read correctly
	if (interfaces.some(intf => (intf.name == null))) {
		// Manually retrieve the interface name string descriptors
		let tempDevice = new dfu.Device(device_, interfaces[0]);
		await tempDevice.device_.open();
		await tempDevice.device_.selectConfiguration(1);
		let mapping = await tempDevice.readInterfaceNames();
		await tempDevice.close();

		for (let intf of interfaces) {
			if (intf.name === null) {
				let configIndex = intf.configuration.configurationValue;
				let intfNumber = intf['interface'].interfaceNumber;
				let alt = intf.alternate.alternateSetting;
				intf.name = mapping[configIndex][intfNumber][alt];
			}
		}
	}
}

async function connectToDevice(device){
	try {
		await device.open();
	} catch (error) {
		onDisconnect();
		throw error;
	}
	return device;
}	

function verifyDFUProtocol(){
	if(!(device.properties.DFUVersion == 0x011a && device.settings.alternate.interfaceProtocol == 0x02)){
		throw 'Incorrect Device'
	}
}	

function niceSize(n) {
	const gigabyte = 1024 * 1024 * 1024;
	const megabyte = 1024 * 1024;
	const kilobyte = 1024;
	if (n >= gigabyte) {
		return n / gigabyte + 'GB';
	} else if (n >= megabyte) {
		return n / megabyte + 'MB';
	} else if (n >= kilobyte) {
		return n / kilobyte + 'KB';
	} else {
		return n + 'B';
	}
}

function measureFlashSize(){
	let flashSize = 0;
		for (let segment of device.memoryInfo.segments) {
			flashSize += segment.end - segment.start;
		}
	auzaDevice.detectedFlashSize = flashSize;
}

function currentProductObj(){
	for(let i=0; i< auzaProducts.length; i++){
		if(auzaProducts[i].name === auzaDevice.detectedProduct){
			return auzaProducts[i];
		}
	}
	
}	
	
function doesProductMatchFlash(){
	if(auzaDevice.detectedProduct === 'blank device'){
		return true;
	}	
	else{	
		if(auzaDevice.detectedFlashSize == currentProductObj().forFlashSize){		
			return true;
		}
		else{
			return false;
		}	
	}
};	

async function readAuzaInfo(){
	if (device != null){
		let readSize = 1024;
		device.startAddress = 0x08000000;
		try{
			let status = await device.getStatus();
			if (status.state == dfu.dfuERROR) {
				await device.clearStatus();
			}
		}catch(error){
			device.logWarning('Failed to clear status');
			return error;
		}
		try{
			const arrayBuff = await (await device.do_upload(device.properties.TransferSize,readSize)).arrayBuffer();
			return arrayBuff;
		}catch(error){
			return error;
		}			
	}	
}

function parseAuzaInfo(arrayBuff){
	const dataView = new DataView(arrayBuff);
	let words = new Uint32Array(arrayBuff.byteLength / Uint32Array.BYTES_PER_ELEMENT);

	let blankDevice = true;
	let imprintIndex = -1;
	for (var i = 0; i < words.length; ++i){
		let word = dataView.getUint32(i * Uint32Array.BYTES_PER_ELEMENT, true);
		words[i] = word;

		blankDevice &= (word == 0xFFFFFFFF);

		if(word == 0x61757A61 && imprintIndex == -1){
			imprintIndex = i;
		}
	}	

	auzaDevice.isDevVersion = false; // default

	// Option 1) Blank device
	if(blankDevice){
		auzaDevice.isBlankChip = true;
		auzaDevice.detectedProduct = 'blank device';
		return false;
	}
	// Option 2) Auza product with double 'auza' imprint
	else if(imprintIndex != -1 && words[imprintIndex + 1] == 0x61757A61){
		// Reference product ID from JSON to get product name
		for(let i=0; i < auzaProducts.length; i++){
			if(words[imprintIndex + 2] == auzaProducts[i].productId){
				auzaDevice.detectedProduct = auzaProducts[i].name;
				if(words[imprintIndex + 5] == 0x01){
					auzaDevice.isDevVersion = true;
				}

				break;
			}

		}
		// String together firmware version direct from binary
		auzaDevice.detectedFirmwareV = dataView.getUint8(((imprintIndex+3)*4)+2).toString() + '.'
						+ dataView.getUint8(((imprintIndex+3)*4)+1).toString() + '.'
						+ dataView.getUint8(((imprintIndex+3)*4)+0).toString();
		return true;
	}
	// Option 3) Early WP version without auza imprint 
	else{
		if(auzaDevice.detectedFlashSize !== 524288){
			return false;
		}

		// 4 consistent words on WP between 1.0.0 and 1.0.3 near start of program code
		let consiWords = [words[0x204/4],words[0x208/4],words[0x20C/4],words[0x210/4]];
		const match = [0x4000F080, 0xBF00E002, 0x4100F081, 0xBF1F0042];
		if(consiWords.every((val, index) => val === match[index])){	
			// 2 words on WP which vary over versions between 1.0.0 and 1.0.3
			let varyingWords = [words[0x1FC/4], words[0x200/4]];
			if(varyingWords[0] == 0x2000093c && varyingWords[1] == 0x0800b490){
				auzaDevice.detectedFirmwareV = '1.0.0';
			}
			else if(varyingWords[0] == 0x2000093c && varyingWords[1] == 0x0800b4a8){
				auzaDevice.detectedFirmwareV = '1.0.0';
			}	
			else if(varyingWords[0] == 0x2000093c && varyingWords[1] == 0x0800b49c){
				auzaDevice.detectedFirmwareV = '1.0.0';
			}	
			else if(varyingWords[0] == 0x2000093c && varyingWords[1] == 0x0800b4A4){
				auzaDevice.detectedFirmwareV = '1.0.1';
			}	
			else if(varyingWords[0] == 0x2000093c && varyingWords[1] == 0x0800bbd0){
				auzaDevice.detectedFirmwareV = '1.0.2';
			}	
			else if(varyingWords[0] == 0x20000944 && varyingWords[1] == 0x0800c464){
				auzaDevice.detectedFirmwareV = '1.0.3';
			}	
			
			if(auzaDevice.detectedFirmwareV !== null){
				auzaDevice.detectedProduct = 'Wave Packets';
				return true;
			}
			else{
				return false;
			}
		}	
		// Option 4) Device has firmware not recognised
		else {
			return false;
		}
	}	
}

function interfaceOnConnect(){
	document.getElementById('check').style.opacity = '100%';
	document.getElementById('update').style.opacity = '100%';
	document.getElementById('select-version').style.opacity = '100%';
	document.getElementById('latest-checkbox').style.opacity = '100%';

	connectButton = document.getElementById('connect');
	connectButton.classList.replace('connect-connect', 'connect-disconnect');
	connectButton.textContent = 'DISCONNECT';
	connectButton.nextElementSibling.textContent= '';

	// Possibly remaining states even after a previous onDisconnect
	displayProgressInfo('');
	document.getElementById('progbar-box').style.display = 'none';
	document.getElementById('update').style.display = 'block';
	document.getElementById('select-version').getElementsByClassName('select-selected')[0].
		classList.remove('select-arrow-none');
	document.getElementById('check').style.pointerEvents = 'auto';	
}

function onDisconnect(extraMessage){
	connectButton = document.getElementById('connect');
	connectButton.classList.replace('connect-disconnect', 'connect-connect');
	connectButton.textContent = 'CONNECT';
	connectButton.nextElementSibling.textContent= 'to STM32 BOOTLOADER / DFU in FS Mode';

	setLatestBox('default');

	// Lower opacities
	document.getElementById('check').style.opacity = '30%';
	document.getElementById('update').style.opacity = '30%';
	document.getElementById('select-version').style.opacity = '40%';
	document.getElementById('latest-checkbox').style.opacity = '40%';

	displayReadResult('');

	if(auzaDevice.HasUpdated){
		displayStatus('Module auto-quit firmware update mode after successful update');
	}
	else{
		 if(!(typeof extraMessage === 'string')){
			extraMessage = 'Device disconnected';
		 }	

		displayStatus(extraMessage);
	}	

	let select = document.getElementById('select-version').getElementsByTagName('select')[0];
	while (select.firstChild){
		select.removeChild(select.lastChild);
	}
	let option = document.createElement('option');
	option.value = 0;
	option.text = 'Select Firmware Version:';
	select.add(option, 0);
	updateDropdownOptions('select-version');

	device = null;
	forceConnectEnabled = false;
}

function doFirmwareList(){
	var firmwareList = [];

	// If no specific product detected, list all binaries
	if(auzaDevice.detectedProduct === 'blank device' || auzaDevice.detectedProduct == null){
		for(let i = 0; i< auzaProducts.length; i++){
			for(let j=0; j< auzaProducts[i].availableVersions.length; j++){
				firmwareList.push(auzaProducts[i].name + ' ' + 'Firmware' + ' ' +
					auzaProducts[i].availableVersions[j]);
			}	
		}
	}
	// If specific procuct detected, only list relevant binaries
	else{
		for(let i=0; i< auzaProducts.length; i++){
			if(auzaProducts[i].name === auzaDevice.detectedProduct){
				for(let j=0; j< auzaProducts[i].availableVersions.length; j++){
					firmwareList.push(auzaProducts[i].name + ' ' + 'Firmware' + ' ' +
					auzaProducts[i].availableVersions[j]);
				}	
				break;
			}	
		}
	}	
	return firmwareList;	
}

function determineLatestFirmware(product){
	for(let i=0; i< auzaProducts.length; i++){
		if(auzaProducts[i].name === product){
			const versionsStr= [];
			for(let j=0; j< auzaProducts[i].availableVersions.length; j++){
				versionsStr.push(auzaProducts[i].availableVersions[j].split('.', 3));
			}	
			let versions = versionsStr.map(obj => {
				 return [Number(obj[0]), Number(obj[1]), Number(obj[2])]
			});
			// Removes version elements in array until left with the highest one
			for(let k=0; k<3; k++){
				let maxNum = 0;
				for(let j=0; j< versions.length; j++){
					if(versions[j][k] >= maxNum){
						maxNum = versions[j][k];
					}
				}	
				let j = 0; while(j< versions.length){
					if(versions[j][k] < maxNum){
						versions.splice(j, 1);
					}
					else j++;
				}
			}

			return versions[0][0].toString() + '.' 
				   + versions[0][1].toString() + '.'
				   + versions[0][2].toString();
		}
	}
}	

function updateLatestBox(){
	let option = getDropdownSelected('select-version');
	if(option === getDropdownDefault('select-version')){
		return
	}

	let optionProduct = option.slice(0, option.indexOf(' Firmware'));
	let optionVersion = option.slice(option.indexOf(' Firmware')+10);
	let latestVersion = determineLatestFirmware(optionProduct);

	if(optionVersion === latestVersion){
		setLatestBox('checked');
	}	
	else{
		setLatestBox('unchecked');
	}	
}	

function toggleLatestBox(){
	latestBox= document.getElementById('latest-checkbox');

	if(latestBox.classList.contains('latest-unchecked') == true
		|| latestBox.classList.contains('latest-default') == true)
	{
		let product = null;
		if(auzaDevice.detectedProduct !== 'blank device'){
			product = auzaDevice.detectedProduct;
		}
		else{
			let option = getDropdownSelected('select-version');
			if(option !== getDropdownDefault('select-version')){
				product = option.slice(0, option.indexOf(' Firmware'));
			}
		}	
		if(product != null){
			let latestV = determineLatestFirmware(product);
			setDropdownSelected('select-version', product + ' Firmware ' + latestV);
			setLatestBox('checked');
		}	
		closeAllDropdowns('select-version');
	}	
	else if(latestBox.classList.contains('latest-checked') == true){
		setLatestBox('default');
		resetDropdownSelected('select-version');
		closeAllDropdowns('select-version');
	}	
}

function displayStatus(message, secondLine){
	let status = document.getElementById('status');

	if(secondLine){
		if(status.textContent != message){
			status.appendChild(document.createElement('br'));
			status.insertAdjacentText('beforeend', message);
		}
	}
	else{
		status.textContent = message;
	}	
}

function displayReadResult(message, secondLine){
	let readEl = document.getElementById('version-result-text');

	if(secondLine){
		if(readEl.textContent != message){
			readEl.appendChild(document.createElement('br'));
			readEl.insertAdjacentText('beforeend', message);
		}
	}		
	else{
		readEl.textContent = message;
	}
}

function displayProgress(wayThrough, total){
	let progBar = document.getElementById('progbar');
	progBar.value = wayThrough;
	progBar.max = total;
}

function displayProgressInfo(message, secondLine){
	let progInfo = document.getElementById('proginfo');

	if(message === 'Erasing DFU device memory'){
		message = '1/2 Erasing ARM device memory';
	}
	else if(message === 'Copying data from browser to DFU device'){
		message = '2/2 Flashing ARM device memory with firmware binary';
	}
	
	if(secondLine){
		if(progInfo.textContent != message){
			progInfo.appendChild(document.createElement('br'));
			progInfo.insertAdjacentText('beforeend', message);
		}
	}		
	else{
		progInfo.textContent = message;
	}
}


function logDebug(message){
	console.log(message);
}

document.addEventListener('keydown', event => {
	if(event.key == 'f' || event.key == 'F'){
		forceConnectEnabled = true;
	}
})	

document.addEventListener('keyup', event => {
	if(event.key == 'f' || event.key == 'F'){
		forceConnectEnabled = false;
	}
})

document.addEventListener('DOMContentLoaded', events => { 
	document.getElementById('default-tab').click();

	// Load auza firmware data
	// fetch('auza-products/auza-products.JSON')
	// 	.then(response => response.json())
	// 	.then(data => {
			auzaProducts = AuzaProductsData.auzaProducts;

			// Populate 'Select Module' dropdown from JSON
			let select = document.getElementById('select-product').getElementsByTagName('select')[0];
			for(let i = 0; i < auzaProducts.length; i++){
				if(auzaProducts[i].hasGuide == true){
					let option = document.createElement('option');
					option.value = i+1;
					option.text = auzaProducts[i].name;
					select.add(option, i+1);
				}
			}
			createDropdown('select-product', updateGuideProduct);

			// Add product guides
			let guide = document.getElementsByClassName('guide')[0];
			for(let i = 0; i < auzaProducts.length; i++){
				if(auzaProducts[i].hasGuide == true){
					let filename = auzaProducts[i].filename;	
					fetch('auza-products/guides/' + filename + '/guide-' + filename + '.html')
					.then(response => {
					  return response.text();
					})
					.then(text => {
						// DIV element with display to be turned on and off
						let guideHTML = (new DOMParser()).parseFromString(text,'text/html');
						let origProductGuide = guideHTML.getElementsByClassName('guide')[0].firstElementChild;
						let productGuide = origProductGuide.cloneNode(true);
						productGuide.style.display = "none";
						guide.appendChild(productGuide);

						// Stylesheet appended to DOM
						let linkEl = document.createElement('link');
						linkEl.setAttribute('rel', 'stylesheet');
						linkEl.setAttribute('type', "text/css");
						linkEl.setAttribute('href', 'auza-products/guides/' + filename + '/guide-' + filename + '.css');
						document.getElementsByTagName('head')[0].appendChild(linkEl);

					 	guides.push({ 
							name: auzaProducts[i].name, 
							element: productGuide, 
							usesTool: auzaProducts[i].compatWithTool
						});
					});
				}
			}

		// })	
		// .catch(err => {
		// 	console.log('Didn\'t load auza products JSON. Error: ', err);
		// })


	createDropdown('select-version', updateLatestBox);	

	let binaryFile = null;

	let checkButton = document.getElementById('check');
	let updateButton = document.getElementById('update');

	let connectButton = document.getElementById('connect');

	connectButton.addEventListener('click', async function(){
		if(device){
			await device.close();
			onDisconnect('Device disconnected');
		}
		else{
			auzaDevice.detectedProduct = null;
			auzaDevice.detectedFirmwareV = null;
			auzaDevice.detectedFlashSize = null;
			auzaDevice.isBlankChip = false;
			auzaDevice.HasUpdated = false;

			const filters = [
				{
				vendorId: 0x0483, 
				productId: 0xdf11,
				// serialNumber: ['STM32FxSTM32', 'STM32G43x/G44x']
				}
			] 

			navigator.usb.requestDevice({'filters': filters }).then(
				async selectedDevice => {
					let interfaces = dfu.findDeviceDfuInterfaces(selectedDevice);
					if(interfaces.length != 0) {
						await fixInterfaceNames(selectedDevice, interfaces);
						device = await connectToDevice(new dfu.Device(selectedDevice, interfaces[0]));
						device = new dfuse.Device(device.device_, device.settings);

						try {						
							let desc = {};
							// Read functional descriptor through configuration descriptor
							// and store as device 'properties'
							desc = await getDFUDescriptorProperties(device);
							if (desc && Object.keys(desc).length > 0){
								device.properties = desc;
							}
							else{
								throw 'Incorrect Device';
							}
							verifyDFUProtocol()
							measureFlashSize();

							let arrayBuff = await readAuzaInfo();
							let auzaFirmware = parseAuzaInfo(arrayBuff);

							if(auzaFirmware){
								// Auza firmware on incorrect device
								if(!doesProductMatchFlash()){
									displayStatus ('Connected to an erroneous device with ' +
										auzaDevice.detectedProduct + ' firmware'
									);
								}
								// Auza firmware on correct device
								else{
									displayStatus('Connected to '+ auzaDevice.detectedProduct);
								}
							}	
							else if(auzaDevice.isBlankChip){
								displayStatus('Connected to '+ niceSize(auzaDevice.detectedFlashSize) +
								' ' + auzaDevice.detectedProduct);
							}
							else{
								if(forceConnectEnabled){
									displayStatus('Force connected to unrecognised '+ niceSize(auzaDevice.detectedFlashSize) +
									' device.');
									displayStatus('Proceed with caution!', true);
								}
								else{
									await device.close();
									onDisconnect('Device was not recognised! Contact Auza for assistance');
								}
							}	

							if(device != null){
								interfaceOnConnect();
								navigator.usb.addEventListener('disconnect', onDisconnect);

								let firmwareList = doFirmwareList();
								let select = document.getElementById('select-version').getElementsByTagName('select')[0];
								for(let i = 0; i < firmwareList.length; i++){
									let option = document.createElement('option');
									option.value = i+1;
									option.text = firmwareList[i];
									select.add(option, i+1);
								}
								updateDropdownOptions('select-version');

								  
							}
						} catch (error){
							onDisconnect();
						}		
					}
				}
			)
			.catch(() => {
				displayStatus('Browser not connected to module')
				displayStatus('Refer to Connection Guide if STM32 BOOTLOADER is not listed', true);
			})
		}	
	})

	updateButton.addEventListener('click', async function(event){
		event.preventDefault();
      event.stopPropagation();

		if(device == null) return false;

		let option = getDropdownSelected('select-version');
		let optionProduct = option.slice(0, option.indexOf(' Firmware'));
		let optionVersion = option.slice(option.indexOf(' Firmware')+10);

		let binaryFile = null;
		for(let i=0; i< auzaProducts.length; i++){
			if(auzaProducts[i].name === optionProduct){
				let binary = auzaProducts[i].filename + '_' + optionVersion.replaceAll('.', '_') + '.bin';
				let binaryPath = 'auza-products/binaries/' + auzaProducts[i].filename + '/' + binary;

				let response = await fetch(binaryPath);
				binaryFile = await response.arrayBuffer();
				break;
			}
		}	

		if(device && binaryFile != null){
			device.logProgress = displayProgress;
			device.logDebug = logDebug;
			device.logInfo = displayProgressInfo;
			device.logWarning = logDebug;
			device.logError = logDebug;

			let doDownload = false;
			try{
				let status = await device.getStatus();
				if(status.state == dfu.dfuERROR){
					await device.clearStatus();
				}
				doDownload = true;
			}catch(error){
				device.logWarning('Failed to clear status');
			}

			if(doDownload){
				document.getElementById('latest-checkbox').style.pointerEvents = 'none';
				document.getElementById('check').style.pointerEvents = 'none';
				document.getElementById('update').style.display = 'none';
				let selectEl = document.getElementById('select-version');
				selectEl.style.pointerEvents = 'none';
				selectEl.getElementsByClassName('select-selected')[0].classList.add('select-arrow-none');
				document.getElementById('progbar-box').style.display = 'block';

				device.startAddress = 0x08000000;
				await device.do_download(device.properties.TransferSize, binaryFile, device.properties.ManifestationTolerant)
				.then(() => {
					auzaDevice.HasUpdated = true;
					displayProgressInfo('Successful! Running ' + option, false);
					displayProgressInfo('Turn off power supply before removing USB', true);
					displayStatus('Module auto-quit firmware update mode after successful update');
				})
				.catch(error => {
					displayProgressInfo('Unsuccessful. Contact Auza for assistance.')
				})
				.finally(() => {
					document.getElementById('latest-checkbox').style.pointerEvents = 'auto';
					document.getElementById('check').style.pointerEvents = 'auto';		
					document.getElementById('update').style.pointerEvents = 'auto';	
					selectEl.style.pointerEvents = 'auto';
					selectEl.getElementsByClassName('select-selected')[0].classList.remove('select-arrow-none');
				})	
			}
		}	
	})

	checkButton.addEventListener('click', async function(event){
		event.preventDefault();
      event.stopPropagation();

		displayReadResult(' ');
		if(device == null) return false;

		try{
			const arrayBuff = await readAuzaInfo();
			let auzaFirmware = parseAuzaInfo(arrayBuff);

			if(auzaFirmware){
				if(auzaDevice.isDevVersion == true){
					displayReadResult('DEVELOPMENT CODE (' + auzaDevice.detectedProduct + ' ' + auzaDevice.detectedFirmwareV + ')', true)
				}
				else{	
					displayReadResult(auzaDevice.detectedProduct + ' ' + 'Firmware' + ' '
						+ auzaDevice.detectedFirmwareV);
					if(auzaDevice.detectedFirmwareV == determineLatestFirmware(auzaDevice.detectedProduct)){
						displayReadResult('This is the latest version available', true)
					}
					else{
						displayReadResult('A newer version is available', true)
					}
				}		
			}
			else if(auzaDevice.isBlankChip){
				displayReadResult('No firmware detected');
			}
			else{
				displayReadResult('Firmware not recognised');
			}	
			
		}catch(error){
			displayReadResult(error);
		}			
	})
})