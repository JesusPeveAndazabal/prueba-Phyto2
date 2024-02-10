// import { WebSocketClientService } from './core/services/websocket-client/web-socket-client.service';
import { DatabaseService } from './core/services/database/database.service';
import { environment } from './../environments/environment';
import { Component, OnInit } from '@angular/core';
// import { AndroidFullScreen } from "@awesome-cordova-plugins/android-full-screen/ngx";
import { createSchema } from './core/utils/db-schemas';
import { ElectronService } from './core/services';
import { Configuration } from './core/utils/configuration';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isWeb = false;
  private initPlugin= false;

  constructor(
    private databaseService : DatabaseService,
    private electronService: ElectronService,) {

      this.databaseService.openConnection();

      if(this.electronService.isElectron){
        let file = electronService.fs.readFileSync(electronService.path.resolve("bd/","conf.env"),{encoding:'utf-8'});

        //Leyendo el archivo de configuración
        file.split(`\r\n`).forEach((el)=>{
          let par = el.split("=");
          switch(par[0]){
            case "TOKEN":
              Configuration.token = par[1];
              break;
            case "URL_REST":
              Configuration.urlRest = par[1];
              break;
            case "N_DEVICES":
              Configuration.nDevices = parseInt(par[1]);
              break;
            case "DEVICE_1":
              Configuration.device1 = par[1];
              break;
            case "DEVICE_2":
              Configuration.device2 = par[1];
              break;
            case "DEVICE_3":
              Configuration.device3 = par[1];
              break;
            case "DEVICE_4":
              Configuration.device4 = par[1];
              break;
          }
        });
      }
  }

  ngOnInit(): void {
    // console.log("App initialization", "app.component.ts");
    let onExecution = false; //Variable de control que evita envíos duplicados y sobre carga del tráfico.

    setInterval(()=>{
      if(!onExecution){
        onExecution = true;

        //Loop que envía los registros por guardar en el servidor vía API/REST
        const iteration = async () =>{
         
        };

      iteration();

      }
    },250);
  }
}
