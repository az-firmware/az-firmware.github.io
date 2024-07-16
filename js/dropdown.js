// Custom dropdown (select) UI element, expanded functionality from w3schools example

function createDropdown(elmnt, optCallback){
	var x, j, ll, selElmnt, a, b, c;
   // Target the specified custom select only
   x = document.getElementById(elmnt);
	if(!x.classList.contains('custom-dropdown')){
		return
	}

	selElmnt = x.getElementsByTagName('select')[0];
	ll = selElmnt.length;
	// For each element, create a new DIV that will act as the selected item
	a = document.createElement('DIV');
	a.setAttribute('class', 'select-selected');
	a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
	x.appendChild(a);
	// For each original select element, crea53 a new DIV that will contain the option list
	b = document.createElement('DIV');
	b.setAttribute('class', 'select-items select-hide');
	for (j = 1; j < ll; j++) {
		// Create a new div as an option item for every original select option
		c = document.createElement('DIV');
		c.innerHTML = selElmnt.options[j].innerHTML;
		c.addEventListener('click', function(e){
			// When an item is clicked, update the original select box,
			// and the selected item: 
			var y, i, k, s, h, sl, yl;
			s = this.parentNode.parentNode.getElementsByTagName('select')[0];
			sl = s.length;
			h = this.parentNode.previousSibling;
			for (i = 0; i < sl; i++) {
				if (s.options[i].innerHTML == this.innerHTML){
					s.selectedIndex = i;
					h.innerHTML = this.innerHTML;
					y = this.parentNode.getElementsByClassName('same-as-selected');
					yl = y.length;
					for (k = 0; k < yl; k++) {
						y[k].removeAttribute('class');
					}
					this.setAttribute('class', 'same-as-selected');	
					break;
				}	
			}
			h.click();
		});
		b.appendChild(c);
	}
	x.appendChild(b);

	a.addEventListener('click', function(e) {
		// When clicked, close any other dropdowns & open/close this one
		e.stopPropagation();
		closeAllDropdowns(this);

		if(this.previousElementSibling.length > 1){
			this.nextSibling.classList.toggle('select-hide');
			this.classList.toggle('select-arrow-active');
		}	
		
		// If optional callback was attached, call it 
		if(typeof optCallback === 'function'){
			optCallback();
		}
	});
};

function closeAllDropdowns(elmnt){
	var x, y, i, xl, yl, arrNo = [];
	x = document.getElementsByClassName('select-items');
	y = document.getElementsByClassName('select-selected');
	xl = x.length;
	yl = y.length;
	for (i = 0; i < yl; i++){
		if (elmnt == y[i]){
			arrNo.push(i)
		} 
		else{
			y[i].classList.remove('select-arrow-active');
		}
	}
	for (i = 0; i < xl; i++){
		if (arrNo.indexOf(i)){
			x[i].classList.add('select-hide');
		}
	}
}

function updateDropdownOptions(elmnt){
	var x, j, ll, selElmnt, a, b, c;
	// Target the specified custom select only
   x = document.getElementById(elmnt);
	selElmnt = x.getElementsByTagName('select')[0];
	ll = selElmnt.length;

	// Reset what is shown
	a = x.getElementsByClassName('select-selected')[0];
	let prevSelected = a.innerHTML;
	a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
	// Hide dropdown and reset arrow
	if(a.innerHTML !== prevSelected){
		if(!a.nextSibling.classList.contains('select-hide')){
			a.nextSibling.classList.add('select-hide');
		}
		if(a.classList.contains('select-arrow-active')){
			a.classList.remove('select-arrow-active');
		}	
	}	
	
	// Clear all custom options
	b = x.getElementsByClassName('select-items')[0];
	while (b.firstChild){
		b.removeChild(b.lastChild);
	}
	// Regenerate all custom options
	for (j = 1; j < ll; j++) {
		/* For each option in the original select element,
		create a new DIV that will act as an option item: */
		c = document.createElement('DIV');
		c.innerHTML = selElmnt.options[j].innerHTML;
		c.addEventListener('click', function(e){
			/* When an item is clicked, update the original select box,
			and the selected item: */
			var y, i, k, s, h, sl, yl;
			s = this.parentNode.parentNode.getElementsByTagName('select')[0];
			sl = s.length;
			h = this.parentNode.previousSibling;
			for (i = 0; i < sl; i++) {
				if (s.options[i].innerHTML == this.innerHTML){
					s.selectedIndex = i;
					h.innerHTML = this.innerHTML;
					y = this.parentNode.getElementsByClassName('same-as-selected');
					yl = y.length;
					for (k = 0; k < yl; k++) {
						y[k].removeAttribute('class');
					}
					this.setAttribute('class', 'same-as-selected');
					break;
				}	
			}
			h.click();
		});
		b.appendChild(c);
	}
}	

function getDropdownSelected(elmnt){
	var x, a;

	x = document.getElementById(elmnt);
	a = x.getElementsByClassName('select-selected')[0];

	return a.innerHTML;
}	

function getDropdownDefault(elmnt){
   x = document.getElementById(elmnt);
	var selElmnt = x.getElementsByTagName('select')[0];

	return selElmnt.options[0].innerHTML;
}	

function resetDropdownSelected(elmnt){
	var x, selElmnt, a, b;

	x = document.getElementById(elmnt);
	a = x.getElementsByClassName('select-selected')[0];
	b = x.getElementsByClassName('select-items')[0];
	selElmnt = x.getElementsByTagName('select')[0];

	selElmnt.selectedIndex = 0;
	a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;

	for(let i = 0; i < b.children.length; i++){
		b.children[i].removeAttribute('class');
	}
}	

function setDropdownSelected(elmnt, optionText){
	var x, selElmnt, a, b;

	x = document.getElementById(elmnt);
	a = x.getElementsByClassName('select-selected')[0];
	b = x.getElementsByClassName('select-items')[0];
	selElmnt = x.getElementsByTagName('select')[0];

   for(let i = 0; i < selElmnt.options.length; i++){
      if(optionText === selElmnt.options[i].innerHTML){
         selElmnt.selectedIndex = i;
	      a.innerHTML = selElmnt.options[i].innerHTML;
         break;
      }   
   }
	for(let i = 0; i < b.children.length; i++){
		b.children[i].removeAttribute('class');
		if(i == (selElmnt.selectedIndex - 1)){
			b.children[i].setAttribute('class', 'same-as-selected');
		}
	}	
}	