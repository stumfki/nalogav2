import { Component, OnInit } from '@angular/core';
import { FormBuilder,  FormGroup, Validators} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { sloveneNumberValidator } from '../validators/slovene-number.validator';



@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.sass']
})
export class HomeComponent implements OnInit{
  services: any[] = [];
  barbers: any[] = [];
  appointments: any[] = []
 

  constructor(private formBuilder: FormBuilder, private http: HttpClient, private DataService: DataService, private router: Router) {
    this.DataService.getServices().subscribe((data) => {
      for (let item of data) {
        this.services.push(item);
      }
    });
  
    this.DataService.getBarbers().subscribe((data) => {
      this.barbers = data;
    });
  
    this.DataService.getAppointments().subscribe((data) => {
      for (let appointment of data) {
        this.appointments.push(appointment);
      }
    });
  }
  

 

   
form: FormGroup = new FormGroup({});

ngOnInit() {
  this.form = this.formBuilder.group({
    name: ['', Validators.required],
    surname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    contactNumber: ['', [Validators.required, sloveneNumberValidator]],
    barber: ['', Validators.required],
    service: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required]
  });

  this.form.controls['time'].disable();

  this.form.controls['date'].valueChanges.subscribe(value => {
    this.updateTimeControlState();
  });

  this.form.controls['service'].valueChanges.subscribe(value => {
    this.updateTimeControlState();
  });

  this.form.controls['barber'].valueChanges.subscribe(value => {
    this.updateTimeControlState();
  });
}


updateTimeControlState() {
  const date = this.form.controls['date'].value;
  const service = this.form.controls['service'].value;
  const barber = this.form.controls['barber'].value;

  if (date && service && barber) {
    this.form.controls['time'].enable();
  } else {
    this.form.controls['time'].disable();
  }
}

selectedBarberStartHour: number = 0
selectedBarberEndHour: number = 0
selectedBarberBrakeStart: number = 0
selectedBarberBrakeDuration: number = 0


//Setting Date
onDateChange(event: any) {
  const dayOfWeek = (event.value.getDay() + 6) % 7 + 1;

  this.DataService.getBarbers().subscribe(data => {
    const selectedBarber = this.form?.get('barber')?.value;

    this.selectedBarberStartHour = data[selectedBarber - 1].workHours[dayOfWeek - 1].startHour;
    this.selectedBarberBrakeStart = data[selectedBarber - 1].workHours[dayOfWeek - 1].lunchTime.startHour;
    this.selectedBarberBrakeDuration = data[selectedBarber - 1].workHours[dayOfWeek - 1].lunchTime.durationMinutes;
    this.selectedBarberEndHour = Number(data[selectedBarber - 1].workHours[dayOfWeek - 1].endHour);
  });
}

times: any[] = [];

getMinutesSinceMidnight(time: string): number {
  const [hours, minutes] = time.split(':');
  const totalMinutes = (parseInt(hours) * 60) + parseInt(minutes);
  return totalMinutes;
}

onTimeChange() {
  if(!this.form.controls['time'].disabled) {
  this.times = []
  let timeCounter = this.selectedBarberStartHour;
  //Get Starting Hours
  for (let i = 0; i < Math.abs(this.selectedBarberStartHour - this.selectedBarberEndHour); i++) {
    for (let j = 0; j < 60; j += 5) {
      let minutes = j.toString();
      if (j === 0) {
        minutes = "00";
      }
      if (j === 5) {
        minutes = "0" + 5;
      }
      let timeString = timeCounter.toString().padStart(2, "0") + ":" + minutes;
      this.times.push(timeString);
    }
    timeCounter++;
  }
  

  //Filter Brake
  for (let i = 0; i < this.times.length; i++) {
    if (this.times[i] === (JSON.stringify(this.selectedBarberBrakeStart) + ':00')) {
      let brakeDurationSlice = 0;
      for (let j = 0; j < this.selectedBarberBrakeDuration; j += 5) {
        brakeDurationSlice += 1;
      }
      let removeTimeForBrake = this.times.splice(i, brakeDurationSlice);
      break;
    }
  }
  

  //Filter Other Appointments
  for (let i = 0; i < this.appointments.length; i++) {

    const startTime = this.appointments[i].startDate;
    const date = new Date(startTime * 1000);
    const formattedDate = date.toLocaleDateString('en-GB');

  
    const userDateValue = this.form?.get('date')?.value;
    const userDate = new Date(userDateValue);
    const formattedUserDate = userDate.toLocaleDateString('en-GB');
 
  
    if (formattedDate === formattedUserDate && this.form.get('barber')?.value === this.appointments[i].barberId) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      for (let j = 0; j < this.times.length; j++) {
        if (this.times[j] === (hours > 10 ? JSON.stringify(hours) : '0' + JSON.stringify(hours)) + ':' + (minutes === 0 ? "00" : (minutes === 5 ? "0" + minutes.toString() : minutes.toString().padStart(2, '0')))) {
          const serviceSelected = this.form?.get('service')?.value === 1 ? 4 : (this.form?.get('service')?.value === 2 ? 6 : (this.form?.get('service')?.value === 3 ? 10 : 0));
          const appointmentLength = this.appointments[i].serviceId === 1 ? 4 : (this.appointments[i].serviceId === 2 ? 6 : (this.appointments[i].serviceId === 3 ? 10 : 0));
          const remainingElements = this.times.length;
          
          let startIndex = Math.max(j - serviceSelected, 0); 
          let endIndex = Math.min(j + appointmentLength, this.times.length); 
          let removeTimeForOtherAppointments = this.times.splice(startIndex, endIndex - startIndex);
        }
      }
    }
    
  }



  

  
}
}

weekendsDatesFilter = (d: Date | null): boolean => {
  const day = (d || new Date()).getDay();
  return day !== 0 && day !== 6;
};



price: string = "Please select a service"

onServiceChange(event: any) {
  const selectedServiceId =  Number(event.value)

  for(let service of this.services) {
    if(selectedServiceId === service.id) {
      this.price = "Price is " + this.services[selectedServiceId - 1].price + " €"
      
    }
  }

}




//Submit

submitted: boolean = false;
formUnix = {}
onSubmit() {
  
  if (this.form != null) {

  //Convert to unix

      const dateString = this.form.get('date')?.value;
      const timeString = this.form.get('time')?.value;
      const date = new Date(dateString);
      const [hours, minutes] = timeString.split(':');
      date.setHours(hours);
      date.setMinutes(minutes);
      const unixTimestamp = Math.floor(date.getTime() / 1000);

  //--------------


    const formData = {
      startDate: unixTimestamp,
      barberId: this.form.get('barber')?.value,
      serviceId: this.form.get('service')?.value,
      
    
    }
    this.formUnix = formData
  }
  this.submitted = true;

  if (this.form.valid) {
   
      this.DataService.postData(this.formUnix).subscribe(
        (response) => {
          console.log('Appointment saved successfully', response);
          this.router.navigate(['/success'])
        },
        (error) => {
          console.log('Error while saving appointment', error);
        }
      );
      
  }
}





}