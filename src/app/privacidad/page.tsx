export const metadata = {
  title: "Política de privacidad — Pizzería 90 grados",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 leading-relaxed text-gray-800">
      <a href="/pedir" className="text-sm text-brand">
        ← Volver
      </a>
      <h1 className="mt-3 text-2xl font-bold">
        Política de Tratamiento de Datos Personales
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Pizzería 90 grados · Ley 1581 de 2012 (Habeas Data)
      </p>

      <section className="mt-6 space-y-4 text-sm">
        <div>
          <h2 className="font-semibold">1. Responsable del tratamiento</h2>
          <p>
            Pizzería 90 grados (sede Facatativá) es responsable del tratamiento
            de los datos personales que usted suministra al realizar un pedido a
            domicilio.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">2. Datos que recolectamos</h2>
          <p>
            Recolectamos únicamente los datos necesarios para procesar y entregar
            su pedido:
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>Nombre</li>
            <li>Número de teléfono</li>
            <li>Dirección de entrega y pueblo</li>
            <li>Notas de entrega (opcional)</li>
            <li>Detalle y método de pago del pedido</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold">3. Finalidad</h2>
          <p>
            Sus datos se usan exclusivamente para: recibir y preparar su pedido,
            coordinar la entrega a domicilio, contactarlo en caso de dudas sobre
            la entrega y llevar el registro de ventas del negocio. No vendemos ni
            compartimos sus datos con terceros con fines publicitarios.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">4. Sus derechos</h2>
          <p>
            Conforme a la Ley 1581 de 2012, usted puede conocer, actualizar,
            rectificar y solicitar la supresión de sus datos, así como revocar la
            autorización otorgada. Para ejercer estos derechos puede comunicarse
            con la pizzería por los canales de contacto publicados.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">5. Autorización</h2>
          <p>
            Al marcar la casilla de aceptación y enviar su pedido, usted autoriza
            de manera libre, previa, expresa e informada el tratamiento de sus
            datos personales conforme a esta política.
          </p>
        </div>
      </section>
    </main>
  );
}
