using System;
using System.Windows.Forms;
using System.Drawing;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace LosPapusUpdater {
    public class Program {
        [STAThread]
        static void Main(string[] args) {
            // Argumentos esperados: [PID_LAUNCHER] [DIRECTORIO_FUENTE] [DIRECTORIO_DESTINO] [NOMBRE_EJECUTABLE] [RUTA_LOGO]
            if (args.Length < 4) {
                MessageBox.Show("Este actualizador no debe ejecutarse manualmente.", "LosPapus Updater");
                return;
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new UpdateForm(args));
        }
    }

    public class UpdateForm : Form {
        private ProgressBar pb;
        private Label lbl;
        private string[] _args;
        private PictureBox logoBox;

        public UpdateForm(string[] args) {
            _args = args;
            InitializeComponent();
            this.Shown += (s, e) => {
                Thread updateThread = new Thread(DoUpdate);
                updateThread.IsBackground = true;
                updateThread.Start();
            };
        }

        private void InitializeComponent() {
            this.Text = "LosPapus - Protocolo de Actualización";
            this.Size = new Size(450, 280);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.None; // Estética premium sin bordes
            this.BackColor = Color.FromArgb(20, 20, 20); // Fondo oscuro
            this.ControlBox = false;
            this.TopMost = true;

            // Panel para borde estético
            Panel mainPanel = new Panel();
            mainPanel.Dock = DockStyle.Fill;
            mainPanel.BorderStyle = BorderStyle.FixedSingle;
            this.Controls.Add(mainPanel);

            // Logo de LosPapus
            logoBox = new PictureBox();
            logoBox.Size = new Size(100, 100);
            logoBox.Location = new Point(175, 25);
            logoBox.SizeMode = PictureBoxSizeMode.Zoom;
            if (_args.Length > 4 && File.Exists(_args[4])) {
                try {
                    logoBox.Image = Image.FromFile(_args[4]);
                } catch { }
            }
            mainPanel.Controls.Add(logoBox);

            // Etiqueta de estado
            lbl = new Label();
            lbl.Text = "INICIANDO PROTOCOLO...";
            lbl.ForeColor = Color.FromArgb(255, 183, 197); // Color primario LosPapus
            lbl.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            lbl.Location = new Point(25, 140);
            lbl.Size = new Size(400, 30);
            lbl.TextAlign = ContentAlignment.MiddleCenter;
            mainPanel.Controls.Add(lbl);

            // Barra de progreso
            pb = new ProgressBar();
            pb.Location = new Point(50, 185);
            pb.Size = new Size(350, 10);
            pb.Style = ProgressBarStyle.Continuous;
            pb.ForeColor = Color.FromArgb(255, 183, 197);
            mainPanel.Controls.Add(pb);

            // Footer
            Label footer = new Label();
            footer.Text = "NO CIERRE ESTA VENTANA - SISTEMA DE ALTA PRIORIDAD";
            footer.ForeColor = Color.Gray;
            footer.Font = new Font("Segoe UI", 7, FontStyle.Regular);
            footer.Location = new Point(0, 250);
            footer.Size = new Size(450, 20);
            footer.TextAlign = ContentAlignment.MiddleCenter;
            mainPanel.Controls.Add(footer);
        }

        private void SetStatus(string text, int progress) {
            if (this.InvokeRequired) {
                this.Invoke(new MethodInvoker(() => SetStatus(text, progress)));
                return;
            }
            lbl.Text = text.ToUpper();
            if (progress >= 0 && progress <= 100) pb.Value = progress;
        }

        private void DoUpdate() {
            try {
                int pid = int.Parse(_args[0]);
                string sourceDir = _args[1];
                string destDir = _args[2];
                string exeToStart = _args[3];

                SetStatus("Esperando cierre del proceso...", 10);
                try {
                    Process p = Process.GetProcessById(pid);
                    if (p != null && !p.HasExited) {
                        p.WaitForExit(15000);
                        if (!p.HasExited) p.Kill();
                    }
                } catch { } // Si ya cerró, ignorar

                Thread.Sleep(1500); // Breve espera para liberar bloqueos de archivos

                SetStatus("Analizando archivos nuevos...", 20);
                if (!Directory.Exists(sourceDir)) throw new Exception("Error: Carpeta fuente no encontrada.");

                // Si hay una subcarpeta única en el ZIP, entrar en ella
                string[] subDirs = Directory.GetDirectories(sourceDir);
                string[] subFiles = Directory.GetFiles(sourceDir);
                if (subDirs.Length == 1 && subFiles.Length == 0) {
                    sourceDir = subDirs[0];
                }

                SetStatus("Aplicando parche al núcleo...", 30);
                CopyDirectory(sourceDir, destDir);

                SetStatus("Sincronización completa.", 95);
                Thread.Sleep(1000);

                string launcherExe = Path.Combine(destDir, exeToStart);
                if (File.Exists(launcherExe)) {
                    Process.Start(launcherExe);
                }

                Application.Exit();
            } catch (Exception ex) {
                MessageBox.Show("ERROR CRÍTICO: " + ex.Message, "Error en LosPapus Updater");
                Application.Exit();
            }
        }

        private void CopyDirectory(string source, string dest) {
            DirectoryInfo dir = new DirectoryInfo(source);
            DirectoryInfo[] dirs = dir.GetDirectories();

            if (!Directory.Exists(dest)) Directory.CreateDirectory(dest);

            FileInfo[] files = dir.GetFiles();
            int i = 0;
            foreach (FileInfo file in files) {
                string targetPath = Path.Combine(dest, file.Name);
                
                // Reintento manual para archivos bloqueados
                bool success = false;
                for (int r = 0; r < 5; r++) {
                    try {
                        file.CopyTo(targetPath, true);
                        success = true;
                        break;
                    } catch {
                        Thread.Sleep(800);
                    }
                }
                
                if (!success) throw new Exception("No se pudo reemplazar: " + file.Name + ". Asegúrate de cerrar todo.");

                i++;
                int prog = 30 + (int)((float)i / files.Length * 60);
                SetStatus("Sincronizando: " + file.Name, prog);
            }

            foreach (DirectoryInfo subDir in dirs) {
                string newDestDir = Path.Combine(dest, subDir.Name);
                CopyDirectory(subDir.FullName, newDestDir);
            }
        }
    }
}
