import "@grapecity/wijmo.styles/wijmo.css";
import dayjs from "dayjs";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as pdf from "@grapecity/wijmo.pdf";
import * as wijmo from "@grapecity/wijmo";
import {formatValue} from 'react-currency-input-field';

import logo from "../assets/images/logopdf.png"

class PdfReport extends React.Component {
  constructor(props) {
    super(props);
    this.colWidth = 67;
    this.rowHeight = 18;
  }
  render() {
    return (
      <div className="container-fluid">
        <button className="btn btn-default" onClick={this.exportPDF.bind(this)}>
          Export
        </button>
      </div>
    );
  }
  exportPDF(data) { 
    let filename = `Reporte de transacciones ViPPO ${dayjs(new Date()).format("DD-MM-YYYY hhmmA")}`;
    let doc = new pdf.PdfDocument({
      header: {
        declarative: {
          text: "Reporte de transacciones ViPPO\t&[Page]\\&[Pages]",
          font: new pdf.PdfFont("Roboto", 10),
          brush: "#878B8C",
        },
      },
      lineGap: 2,
      pageSettings: {
        margins: {
          left: 36,
          right: 36,
          top: 36,
          bottom: 36,
        },
      },
      ended: (sender, args) => pdf.saveBlob(args.blob, `${filename}.pdf`),
    });
    this.$_drawTransactions(doc, data);
    doc.end();
  }

  $_drawTransactions(doc, inData) {
    const { data } = inData;
    //
    let numberPages = 1;
    let columns = [
        { header: "Referencia", binding: "reference", format: "c" },
        { header: "Monto", binding: "amount", format: "c" },
        { header: "Tasa", binding: "bcvRate", format: "c" },
        { header: "Ref.", binding: "ref", format: "c" },
        { header: "Nota", binding: "noteNumber", format: "c" },
        { header: "Lote", binding: "batch", format: "c" },
        { header: "Banco", binding: "bankID", format: "c" },
        { header: "Estatus", binding: "status", format: "c" },
        { header: "Usuario", binding: "tillUser", format: "c" },
        { header: "Caja", binding: "tillID", format: "c" },
        { header: "Fecha", binding: "date", format: "c" },
      ],
      bold = new pdf.PdfFont("Roboto", 10, "normal", "bold"),
      colWidth = this.colWidth,
      rowHeight = this.rowHeight;
    //
    // Agrega la imagen al documento PDF
    doc.drawImage(logo, null, null, 300, 300);
    
    // * draw captions *
    //
    doc.drawText("Fecha de emisión: ", 360, 30, { font: bold});
    doc.drawText(`${dayjs(new Date()).format("DD/MM/YYYY hh:mmA")}`);
    //
    doc.moveDown(2);
    //
    let y = doc.y;
    doc.drawText("Razón Social: ", 20, y, { font: bold, continued: true });
    doc.drawText(JSON.parse(sessionStorage.getItem("loginData")).rif);
    //
    //
    doc.drawText("Usuario: ", 180, y, { font: bold, continued: true });
    doc.drawText(JSON.parse(sessionStorage.getItem("loginData")).user);
    doc.moveDown(1);
    //
    doc.drawText("IP: ", 360, y, { font: bold, continued: true });
    doc.drawText(sessionStorage.getItem("ip"));
    //
    y = doc.y;
    doc.drawText("Sucursal: ", 20, y, { font: bold, continued: true });
    doc.drawText(JSON.parse(sessionStorage.getItem("loginData")).branchCommerce);
    //
    doc.drawText("Caja: ", 190, y, { font: bold, continued: true });
    doc.drawText(JSON.parse(sessionStorage.getItem("loginData")).cashDeskId);
    //
    doc.moveDown(2);
    //
    // * draw table *
    doc.saveState();
    //
    y = 0;
    let scale = doc.width / (columns.length * colWidth),
      docY = doc.y;
    //
    if (scale > 1) {
      scale = 1;
    }
    //
    doc.scale(scale, scale, new wijmo.Point(0, docY));
    doc.translate(0, docY);
    //
    // header
    this.$_renderRow(doc, y, columns, (column) => column.header, bold, "rgba(159, 189, 55, 0.4)");
    //
    y += rowHeight;
    //
    // body
    if (Array.isArray(data)) {
      let pageOne = 720;
      data.forEach((item) => {
        //Agrega el item "ref" a la tabla que es el calculo de la referencia del dia
        if(Number(item.bcvRate) > 0){
          item.ref = Number(item.amount) / Number(item.bcvRate)
        }else{
          item.ref = 'N/A'
        }
        // Verifica si es necesario agregar una nueva página
        if (numberPages > 1){
          pageOne = 840;
        }
        if (y >= pageOne) {
            doc.addPage();
            numberPages++;
            // Restablece los márgenes en la nueva página (excepto el superior)
            doc.pageSettings.margins.left = 36;
            doc.pageSettings.margins.right = 36;
            doc.pageSettings.margins.bottom = 36;
            y = 0;
          // Redibuja el // header en la nueva página
          let scale = doc.width / (columns.length * colWidth),
          docY = doc.y;
          if (scale > 1) {
              scale = 1;
          }
          doc.scale(scale, scale, new wijmo.Point(0, docY));
          doc.translate(0, docY); 
          this.$_renderRow(doc, y, columns, (column) => column.header, bold, "rgba(159, 189, 55, 0.4)");
          y += rowHeight;
        }
        // Renderiza la fila de datos en la página actual
        this.$_renderRow(
          doc,
          y,
          columns,
          (column) => item[column.binding],
          bold
        );
        y += rowHeight;
      });
    } else {
      console.error("transaction is not an array.");
    }
    //
    // Footer
    // Filtra las transacciones por estado
      const settledTransactions = data.filter((transaction) => transaction.status === "Liquidado");
      const rejectedTransactions = data.filter((transaction) => transaction.status === "Rechazado");
      const pendingTransactions = data.filter((transaction) => transaction.status === "Pendiente");

      // Suma los montos de las transacciones liquidadas, rechazadas y pendientes
      const totalSumSettled = settledTransactions.reduce((total, transaction) => {
        const amount = Number(transaction.amount.replace('.', '').replace(',', '.'));
        return total + amount;
      }, 0).toFixed(2);

      const totalSumRejected = rejectedTransactions.reduce((total, transaction) => {
        const amount = Number(transaction.amount.replace('.', '').replace(',', '.'));
        return total + amount;
      }, 0).toFixed(2);

      const totalSumPending = pendingTransactions.reduce((total, transaction) => {
        const amount = Number(transaction.amount.replace('.', '').replace(',', '.'));
        return total + amount;
      }, 0).toFixed(2);
      //Formatea cada uno de los montos 
      let formattedTotalSettled = formatValue({
        value: totalSumSettled,
        groupSeparator: '.',
        decimalSeparator: ',',
        prefix: 'Bs. '
      });

      let formattedTotalRejected = formatValue({
        value: totalSumRejected,
        groupSeparator: '.',
        decimalSeparator: ',',
        prefix: 'Bs. '
      });

      let formattedTotalPending = formatValue({
        value: totalSumPending,
        groupSeparator: '.',
        decimalSeparator: ',',
        prefix: 'Bs. '
      });

      //y = doc.y;
     // y += rowHeight;
      console.log(y, 'y');
      doc.drawText("Total Liquidadas:  ", 297, y, { font: bold, continued: true });
      doc.drawText(` ${formattedTotalSettled} ${y}`);
      //y += rowHeight;
      console.log(y, 'y2');
      doc.drawText("Total Rechazadas:  ", 297, y, { font: bold, continued: true });
      doc.drawText(` ${formattedTotalRejected} ${y}`);
     // y += rowHeight;
     // console.log(y, 'y3');
      doc.drawText("Total Pendientes:    ", 297, y, { font: bold, continued: true });
      doc.drawText(` ${formattedTotalPending} ${y}`);

 
  }
  //Verifica que el contenido no supere el tamaño de la hoja, para no desbordar la
  //informacion
/*   $_checkLineAvailable(doc) {
    if (doc.height - doc.y < doc.lineHeight() + doc.lineGap) {
      doc.addPage();
    }
  } */
  //
  $_renderRow(doc, y, values, valueGetter, font, brush) {
    let colWidth = this.colWidth,
      rowHeight = this.rowHeight;
       //
      values.forEach((v, idx) => {
      let x = idx * colWidth;
      // Dibuja el rectángulo del borde
      doc.paths
      .rect(x, y, colWidth, rowHeight)
      .stroke("rgba(0, 0, 0, 1)", 2);
      //
      doc.paths
      .rect(x, y, colWidth - 1 , rowHeight - 1)
      .fill(brush || "rgba(255, 255, 255, 0.8)");
      //
      let value = valueGetter != null ? valueGetter(v) : v || "";
      /* let format = formatGetter != null ? formatGetter(v) : '';
       //
       if (value !== 'Total') {
        value = wijmo.changeType(value, wijmo.DataType.String, format);
      }
      // */
      doc.drawText(value, x + 3, y + 5, {
        font: font,
        height: rowHeight,
        width: colWidth, 
      });
    });
  }
}
setTimeout(() => {
  const container = document.getElementById("pdfreport");
  if (container) {
    ReactDOM.render(<PdfReport />, container);
  }
}, 100);

export default PdfReport;
