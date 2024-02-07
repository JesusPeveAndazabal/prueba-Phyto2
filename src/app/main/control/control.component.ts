import { ArduinoService } from './../../core/services/arduino/arduino.service';
import { WorkExecutionData } from './../../core/models/we-data';
import { SocketData, WorkExecutionConfiguration } from './../../core/models/models';
import { LocalConf } from './../../core/models/local_conf';
// import { WebSocketClientService } from './../../core/services/websocket-client/web-socket-client.service';
import { DatabaseService } from './../../core/services/database/database.service';
import { WorkExecution } from './../../core/models/work-execution';
import { Component, Injectable, NgZone, OnInit } from '@angular/core';
// import { environment } from 'src/environments/environment';
import { Sensor, SocketEvent, UnitPressureEnum, WorkStatusChange, convertPressureUnit,config } from './../../core/utils/global';
import { interval, startWith, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
@Injectable({
  providedIn: "root"
})
@Component({
  selector: 'app-control',
  templateUrl: './control.component.html',
  styleUrls: ['./control.component.scss'],
})
export class ControlComponent  implements OnInit {
  wConfig : WorkExecutionConfiguration | undefined;
  wExecution! : WorkExecution;
  localConfig! : LocalConf;
  leftControlActive : boolean = false;
  rightControlActive : boolean = false;
  //currentVolume: number = 0;
  pressure : number = 0;
  waterFlow : number = 0;
  volume : number = 0;
  maxVolume : number = 0;
  speed : number = 0;
  currentPh : number = 0;
  minVolume: number = 0;
  wFlowAlert : boolean = false;
  pressureAlert : boolean = false;
  info: number = 0;
  longitud: number = 0;
  latitud: number = 0;
  alertShown: boolean = false;
  lastVolume: number | null = null;
  public shouldBlink: boolean = false;
  public caudalError: boolean = false;
  public emergencia: boolean = false;
  public presionError: boolean = false;
  maximoCaudal : number = 0;
  minimoCaudal : number = 0;
  maximoPresion: number = 0;
  minimoPresion: number = 0;
  constructor(private dbService : DatabaseService, private arduinoService :ArduinoService, private zone: NgZone) {

  }

  async ngOnInit() {
    const intervalObservable = interval(1000); // Puedes ajustar el intervalo según sea necesario
    this.wExecution = await this.dbService.getLastWorkExecution();
    this.localConfig = await this.dbService.getLocalConfig();
    this.minVolume = this.localConfig.vol_alert_on;
    this.info = JSON.parse((await this.dbService.getLastWorkExecution()).configuration).pressure;
    console.log(this.info, "teoric_pressure");
    //CAUDAL
    // Combina el observable del intervalo con tu observable de sensor
    intervalObservable.pipe(
      startWith(0), // Emite un valor inicial para que comience inmediatamente
      switchMap(() => this.arduinoService.getSensorObservable(Sensor.WATER_FLOW))
    ).subscribe((valorDelSensor:number) => {
      console.log("initialVolume", this.arduinoService.initialVolume);
      this.waterFlow = valorDelSensor;
      this.maxVolume = this.arduinoService.initialVolume;
      //Configuracion
      config.maxVolume = this.arduinoService.initialVolume;
      this.maximoCaudal = this.localConfig.max_wflow;
      this.minimoCaudal = this.localConfig.min_wflow;
      // this.volume = this.arduinoService.currentRealVolume;
      console.log(this.minimoCaudal, "minVolume");
      console.log(this.waterFlow, "waterFlow");
      console.log(this.maximoCaudal, "maxVolume");
      if (this.waterFlow < this.minimoCaudal * 0.5 || this.waterFlow > this.maximoCaudal * 1.5) {
        this.emergencia = true;
        this.caudalError = true;
      } else if(this.waterFlow > this.minimoCaudal && this.waterFlow < this.maximoCaudal) {
        this.caudalError = false;
        this.emergencia = false;
      }else{
        this.caudalError = true;
        this.emergencia = false;
      }
    });



    intervalObservable.pipe(
      startWith(0), // Emite un valor inicial para que comience inmediatamente
      switchMap(() => this.arduinoService.getSensorObservable(Sensor.PRESSURE))
    ).subscribe((valorDelSensor:number) => {
      this.pressure = valorDelSensor;
      // this.volume = this.arduinoService.currentRealVolume;
      this.minimoPresion = this.localConfig.min_pressure;
      this.maximoPresion= this.localConfig.max_pressure;
      console.log(this.minimoPresion, "minPressure: ");
      console.log(this.pressure, "presure");
      console.log(this.maximoPresion, "maxPressure");
      if (this.pressure < this.minimoPresion * 0.5 || this.pressure > this.maximoPresion * 1.5) {
        this.emergencia = true;
        this.presionError = true;
        // prender todas las luces
      } else if(this.pressure > this.minimoPresion && this.pressure < this.maximoPresion) {
        this.presionError = false;
        this.emergencia = false;
      }else{
        this.presionError = true;
        this.emergencia = false;
      }
    });
    //VOLUMEN
    // Observable que emite cada segundo

    // Combina el observable del intervalo con tu observable de sensor
    intervalObservable.pipe(
      startWith(0), // Emite un valor inicial para que comience inmediatamente
      switchMap(() => this.arduinoService.getSensorObservable(Sensor.VOLUME))
    ).subscribe((valorDelSensor:number) => {
      this.volume = this.arduinoService.currentRealVolume - valorDelSensor;
      console.log(this.volume, "volumen que me está pasando");

      if (this.volume < this.minVolume && this.arduinoService.isRunning || this.volume < this.minVolume && !this.arduinoService.isRunning) {
        this.shouldBlink = true;
        // alert("Debe rellenar el tanque - Valvulas cerradas");
        this.arduinoService.deactivateRightValve();
        this.arduinoService.deactivateLeftValve();
      } else {
        this.shouldBlink = false;
      }
    });

    // PH
    this.arduinoService.getSensorObservable(Sensor.PH).subscribe((valorDelSensor:number) => {
      this.currentPh = valorDelSensor;

    });

    //SPEED - VELOCIDAD
    this.arduinoService.getSensorObservable(Sensor.SPEED).subscribe((valorDelSensor:number) => {
      // console.log("SENSOR DE VELOCIDAD",valorDelSensor);
      this.speed = valorDelSensor;
    });

    // GPS
    this.arduinoService.getSensorObservable(Sensor.GPS).subscribe((valorDelSensor : number[]) => {
      this.latitud=valorDelSensor[0];
      this.longitud=valorDelSensor[1];
      console.log("SENSOR DE GPS",valorDelSensor[1]);
      config.gps.push(valorDelSensor[0], valorDelSensor[1]);
      // LONGITUD/LATITUD
    });
  }

  //Función para abrir y cerrar electrovalvulas
  toggleValvulaDerecha():void{
    this.rightControlActive = !this.rightControlActive;
    if(this.rightControlActive){
      this.arduinoService.activateRightValve();
    }else{
      this.arduinoService.deactivateRightValve();
    }
  }

  //Activar y desactivar la válvulas izquierda
  toggleValvulaIzquierda():void{
    this.leftControlActive = !this.leftControlActive;
    if(this.leftControlActive){
      this.arduinoService.activateLeftValve();
    }else{
      this.arduinoService.deactivateLeftValve();
    }
  }
  // toggleValvulaDerecha($event : any):void{
  //   this.arduinoService.toggleValvulaDerecha();
  // }

  // toggleValvulaIzquierda($event : any):void{
  //   this.arduinoService.toggleValvulaIzquierda();
  // }

  // changeLeftControl($event : any){
  //   let command : SocketData = {
  //     event: SocketEvent.COMMANDS,
  //     type : 0,
  //     data : {
  //       device : Sensor.VALVE_LEFT,
  //       command : `${Number($event)}`
  //     }
  //   };
  // }

  // changeRightControl($event : any){
  //   let command : SocketData = {
  //     event: SocketEvent.COMMANDS,
  //     type : 0,
  //     data : {
  //       device : Sensor.VALVE_RIGHT,
  //       command : `${Number($event)}`
  //     }
  //   };
  // }

  // regulatePressure(){
  //   this.arduinoService.regulatePressureWithBars(+this.info);
  // }

}