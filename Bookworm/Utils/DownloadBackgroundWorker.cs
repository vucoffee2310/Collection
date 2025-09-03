using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Cache;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using CustomEntity;
using Ionic.Zip;

namespace Bookworm.Utils
{
	// Token: 0x0200001C RID: 28
	public class DownloadBackgroundWorker : IDisposable
	{
		// Token: 0x1700007C RID: 124
		// (get) Token: 0x06000153 RID: 339 RVA: 0x00004BE8 File Offset: 0x00002DE8
		// (set) Token: 0x06000154 RID: 340 RVA: 0x00004BF0 File Offset: 0x00002DF0
		public ProgressBar pgPercent { get; set; }

		// Token: 0x1700007D RID: 125
		// (get) Token: 0x06000155 RID: 341 RVA: 0x00004BF9 File Offset: 0x00002DF9
		// (set) Token: 0x06000156 RID: 342 RVA: 0x00004C01 File Offset: 0x00002E01
		public TextBlock txtDownloadStatus { get; set; }

		// Token: 0x1700007E RID: 126
		// (get) Token: 0x06000157 RID: 343 RVA: 0x00004C0A File Offset: 0x00002E0A
		// (set) Token: 0x06000158 RID: 344 RVA: 0x00004C12 File Offset: 0x00002E12
		public TextBlock txtSofile { get; set; }

		// Token: 0x1700007F RID: 127
		// (get) Token: 0x06000159 RID: 345 RVA: 0x00004C1B File Offset: 0x00002E1B
		// (set) Token: 0x0600015A RID: 346 RVA: 0x00004C23 File Offset: 0x00002E23
		public bool DeleteCompletedFilesAfterCancel
		{
			get
			{
				return this.m_deleteCompletedFiles;
			}
			set
			{
				this.m_deleteCompletedFiles = value;
			}
		}

		// Token: 0x17000080 RID: 128
		// (get) Token: 0x0600015B RID: 347 RVA: 0x00004C2C File Offset: 0x00002E2C
		// (set) Token: 0x0600015C RID: 348 RVA: 0x00004C34 File Offset: 0x00002E34
		public int PackageSize
		{
			get
			{
				return this.m_packageSize;
			}
			set
			{
				if (value > 0)
				{
					this.m_packageSize = value;
					return;
				}
				throw new InvalidOperationException("Đã có lình xóa hf.");
			}
		}

		// Token: 0x17000081 RID: 129
		// (get) Token: 0x0600015D RID: 349 RVA: 0x00004C4C File Offset: 0x00002E4C
		// (set) Token: 0x0600015E RID: 350 RVA: 0x00004C54 File Offset: 0x00002E54
		public int StopWatchCyclesAmount
		{
			get
			{
				return this.m_stopWatchCycles;
			}
			set
			{
				if (value > 0)
				{
					this.m_stopWatchCycles = value;
					return;
				}
				throw new InvalidOperationException("The StopWatchCyclesAmount needs to be greather then 0");
			}
		}

		// Token: 0x17000082 RID: 130
		// (get) Token: 0x0600015F RID: 351 RVA: 0x00004C6C File Offset: 0x00002E6C
		public long CurrentFileProgress
		{
			get
			{
				return this.m_currentFileProgress;
			}
		}

		// Token: 0x06000160 RID: 352 RVA: 0x00004C74 File Offset: 0x00002E74
		public void Start()
		{
			this.IsBusy = true;
		}

		// Token: 0x17000083 RID: 131
		// (get) Token: 0x06000161 RID: 353 RVA: 0x00004C7D File Offset: 0x00002E7D
		public long CurrentFileSize
		{
			get
			{
				return (long)this.m_currentFileSize;
			}
		}

		// Token: 0x17000084 RID: 132
		// (get) Token: 0x06000162 RID: 354 RVA: 0x00004C86 File Offset: 0x00002E86
		public long DownloadSpeed
		{
			get
			{
				return (long)this.m_currentSpeed;
			}
		}

		// Token: 0x17000085 RID: 133
		// (get) Token: 0x06000163 RID: 355 RVA: 0x00004C8F File Offset: 0x00002E8F
		public DownloadBackgroundWorker.FileInfo CurrentFile
		{
			get
			{
				return this.Files[this.m_fileNr];
			}
		}

		// Token: 0x06000164 RID: 356 RVA: 0x00004CA2 File Offset: 0x00002EA2
		public double CurrentFilePercentage()
		{
			return this.CurrentFilePercentage(2) * 100.0;
		}

		// Token: 0x06000165 RID: 357 RVA: 0x00004CB8 File Offset: 0x00002EB8
		public double CurrentFilePercentage(int decimals)
		{
			double num = (double)this.CurrentFileProgress;
			double num2 = (double)this.CurrentFileSize;
			if (num > num2)
			{
			}
			return Math.Round(num / num2, decimals);
		}

		// Token: 0x17000086 RID: 134
		// (get) Token: 0x06000166 RID: 358 RVA: 0x00004CED File Offset: 0x00002EED
		// (set) Token: 0x06000167 RID: 359 RVA: 0x00004CF5 File Offset: 0x00002EF5
		public string LocalDirectory
		{
			get
			{
				return this.m_localDirectory;
			}
			set
			{
				if (this.LocalDirectory != value)
				{
					this.m_localDirectory = value;
				}
			}
		}

		// Token: 0x14000004 RID: 4
		// (add) Token: 0x06000168 RID: 360 RVA: 0x00004D0C File Offset: 0x00002F0C
		// (remove) Token: 0x06000169 RID: 361 RVA: 0x00004D44 File Offset: 0x00002F44
		public event EventHandler Started;

		// Token: 0x14000005 RID: 5
		// (add) Token: 0x0600016A RID: 362 RVA: 0x00004D7C File Offset: 0x00002F7C
		// (remove) Token: 0x0600016B RID: 363 RVA: 0x00004DB4 File Offset: 0x00002FB4
		public event EventHandler IsBusyChanged;

		// Token: 0x14000006 RID: 6
		// (add) Token: 0x0600016C RID: 364 RVA: 0x00004DEC File Offset: 0x00002FEC
		// (remove) Token: 0x0600016D RID: 365 RVA: 0x00004E24 File Offset: 0x00003024
		public event EventHandler StateChanged;

		// Token: 0x14000007 RID: 7
		// (add) Token: 0x0600016E RID: 366 RVA: 0x00004E5C File Offset: 0x0000305C
		// (remove) Token: 0x0600016F RID: 367 RVA: 0x00004E94 File Offset: 0x00003094
		public event EventHandler CancelRequested;

		// Token: 0x14000008 RID: 8
		// (add) Token: 0x06000170 RID: 368 RVA: 0x00004ECC File Offset: 0x000030CC
		// (remove) Token: 0x06000171 RID: 369 RVA: 0x00004F04 File Offset: 0x00003104
		public event EventHandler Paused;

		// Token: 0x14000009 RID: 9
		// (add) Token: 0x06000172 RID: 370 RVA: 0x00004F3C File Offset: 0x0000313C
		// (remove) Token: 0x06000173 RID: 371 RVA: 0x00004F74 File Offset: 0x00003174
		public event EventHandler Resumed;

		// Token: 0x1400000A RID: 10
		// (add) Token: 0x06000174 RID: 372 RVA: 0x00004FAC File Offset: 0x000031AC
		// (remove) Token: 0x06000175 RID: 373 RVA: 0x00004FE4 File Offset: 0x000031E4
		public event EventHandler DeletingFilesAfterCancel;

		// Token: 0x1400000B RID: 11
		// (add) Token: 0x06000176 RID: 374 RVA: 0x0000501C File Offset: 0x0000321C
		// (remove) Token: 0x06000177 RID: 375 RVA: 0x00005054 File Offset: 0x00003254
		public event EventHandler Canceled;

		// Token: 0x1400000C RID: 12
		// (add) Token: 0x06000178 RID: 376 RVA: 0x0000508C File Offset: 0x0000328C
		// (remove) Token: 0x06000179 RID: 377 RVA: 0x000050C4 File Offset: 0x000032C4
		public event EventHandler Completed;

		// Token: 0x1400000D RID: 13
		// (add) Token: 0x0600017A RID: 378 RVA: 0x000050FC File Offset: 0x000032FC
		// (remove) Token: 0x0600017B RID: 379 RVA: 0x00005134 File Offset: 0x00003334
		public event EventHandler Stopped;

		// Token: 0x1400000E RID: 14
		// (add) Token: 0x0600017C RID: 380 RVA: 0x0000516C File Offset: 0x0000336C
		// (remove) Token: 0x0600017D RID: 381 RVA: 0x000051A4 File Offset: 0x000033A4
		public event EventHandler IsPausedChanged;

		// Token: 0x1400000F RID: 15
		// (add) Token: 0x0600017E RID: 382 RVA: 0x000051DC File Offset: 0x000033DC
		// (remove) Token: 0x0600017F RID: 383 RVA: 0x00005214 File Offset: 0x00003414
		public event EventHandler CalculationFileSizesStarted;

		// Token: 0x14000010 RID: 16
		// (add) Token: 0x06000180 RID: 384 RVA: 0x0000524C File Offset: 0x0000344C
		// (remove) Token: 0x06000181 RID: 385 RVA: 0x00005284 File Offset: 0x00003484
		public event EventHandler FileSizesCalculationComplete;

		// Token: 0x14000011 RID: 17
		// (add) Token: 0x06000182 RID: 386 RVA: 0x000052BC File Offset: 0x000034BC
		// (remove) Token: 0x06000183 RID: 387 RVA: 0x000052F4 File Offset: 0x000034F4
		public event EventHandler FileDownloadAttempting;

		// Token: 0x14000012 RID: 18
		// (add) Token: 0x06000184 RID: 388 RVA: 0x0000532C File Offset: 0x0000352C
		// (remove) Token: 0x06000185 RID: 389 RVA: 0x00005364 File Offset: 0x00003564
		public event EventHandler FileDownloadStarted;

		// Token: 0x14000013 RID: 19
		// (add) Token: 0x06000186 RID: 390 RVA: 0x0000539C File Offset: 0x0000359C
		// (remove) Token: 0x06000187 RID: 391 RVA: 0x000053D4 File Offset: 0x000035D4
		public event EventHandler FileDownloadStopped;

		// Token: 0x14000014 RID: 20
		// (add) Token: 0x06000188 RID: 392 RVA: 0x0000540C File Offset: 0x0000360C
		// (remove) Token: 0x06000189 RID: 393 RVA: 0x00005444 File Offset: 0x00003644
		public event EventHandler FileDownloadSucceeded;

		// Token: 0x14000015 RID: 21
		// (add) Token: 0x0600018A RID: 394 RVA: 0x0000547C File Offset: 0x0000367C
		// (remove) Token: 0x0600018B RID: 395 RVA: 0x000054B4 File Offset: 0x000036B4
		public event DownloadBackgroundWorker.FailEventHandler FileDownloadFailed;

		// Token: 0x14000016 RID: 22
		// (add) Token: 0x0600018C RID: 396 RVA: 0x000054EC File Offset: 0x000036EC
		// (remove) Token: 0x0600018D RID: 397 RVA: 0x00005524 File Offset: 0x00003724
		public event EventHandler ProgressChanged;

		// Token: 0x14000017 RID: 23
		// (add) Token: 0x0600018E RID: 398 RVA: 0x0000555C File Offset: 0x0000375C
		// (remove) Token: 0x0600018F RID: 399 RVA: 0x00005594 File Offset: 0x00003794
		public event DownloadBackgroundWorker.CalculatingFileSizeEventHandler CalculatingFileSize;

		// Token: 0x17000087 RID: 135
		// (get) Token: 0x06000190 RID: 400 RVA: 0x000055C9 File Offset: 0x000037C9
		// (set) Token: 0x06000191 RID: 401 RVA: 0x000055D4 File Offset: 0x000037D4
		public bool IsPaused
		{
			get
			{
				return this.m_paused;
			}
			set
			{
				if (this.IsBusy)
				{
					if (this.IsPaused != value)
					{
						this.m_paused = value;
						if (this.IsPaused)
						{
							if (this.Paused != null)
							{
								this.Paused(this, new EventArgs());
							}
						}
						else if (this.Resumed != null)
						{
							this.Resumed(this, new EventArgs());
						}
						if (this.IsPausedChanged != null)
						{
							this.IsPausedChanged(this, new EventArgs());
						}
						if (this.StateChanged != null)
						{
							this.StateChanged(this, new EventArgs());
							return;
						}
					}
				}
				else
				{
					MessageBox.Show("Bạn không thể thay đổi thuộc tính tạm dừng khi file dowload chưa được tải");
				}
			}
		}

		// Token: 0x17000088 RID: 136
		// (get) Token: 0x06000192 RID: 402 RVA: 0x00005679 File Offset: 0x00003879
		// (set) Token: 0x06000193 RID: 403 RVA: 0x00005684 File Offset: 0x00003884
		public bool IsBusy
		{
			get
			{
				return this.m_busy;
			}
			set
			{
				if (this.IsBusy != value)
				{
					this.m_busy = value;
					this.m_canceled = !value;
					if (this.IsBusy)
					{
						this.m_totalProgress = 0;
						this.bgwDownloader.RunWorkerAsync();
						if (this.Started != null)
						{
							this.Started(this, new EventArgs());
						}
						if (this.IsBusyChanged != null)
						{
							this.IsBusyChanged(this, new EventArgs());
						}
						if (this.StateChanged != null)
						{
							this.StateChanged(this, new EventArgs());
							return;
						}
					}
					else
					{
						this.m_paused = false;
						this.bgwDownloader.CancelAsync();
						if (this.CancelRequested != null)
						{
							this.CancelRequested(this, new EventArgs());
						}
						if (this.StateChanged != null)
						{
							this.StateChanged(this, new EventArgs());
						}
					}
				}
			}
		}

		// Token: 0x17000089 RID: 137
		// (get) Token: 0x06000194 RID: 404 RVA: 0x00005758 File Offset: 0x00003958
		// (set) Token: 0x06000195 RID: 405 RVA: 0x00005760 File Offset: 0x00003960
		public List<DownloadBackgroundWorker.FileInfo> Files
		{
			get
			{
				return this.m_files;
			}
			set
			{
				if (this.IsBusy)
				{
					throw new InvalidOperationException("Bạn không thể thay đổi danh sách tập tin trong quá trình download");
				}
				if (this.Files != null)
				{
					this.m_files = value;
				}
			}
		}

		// Token: 0x06000196 RID: 406 RVA: 0x00005784 File Offset: 0x00003984
		public void Dispose()
		{
		}

		// Token: 0x06000197 RID: 407 RVA: 0x00005788 File Offset: 0x00003988
		public DownloadBackgroundWorker()
		{
			this.Init();
		}

		// Token: 0x06000198 RID: 408 RVA: 0x000057FC File Offset: 0x000039FC
		private void Init()
		{
			this.bgwDownloader.WorkerReportsProgress = true;
			this.bgwDownloader.WorkerSupportsCancellation = true;
			this.bgwDownloader.DoWork += this.BgwDownloader_DoWork;
			this.bgwDownloader.RunWorkerCompleted += this.BgwDownloader_RunWorkerCompleted;
			this.bgwDownloader.ProgressChanged += this.BgwDownloader_ProgressChanged;
			this.SupportsProgress = true;
			this.PackageSize = 4096;
			this.StopWatchCyclesAmount = 5;
			this.DeleteCompletedFilesAfterCancel = true;
		}

		// Token: 0x06000199 RID: 409 RVA: 0x00005888 File Offset: 0x00003A88
		private void BgwDownloader_ProgressChanged(object sender, ProgressChangedEventArgs e)
		{
			switch (e.ProgressPercentage)
			{
			case 0:
				switch ((DownloadBackgroundWorker.Event)e.UserState)
				{
				case DownloadBackgroundWorker.Event.CalculationFileSizesStarted:
					if (this.CalculationFileSizesStarted != null)
					{
						this.CalculationFileSizesStarted(this, new EventArgs());
						return;
					}
					break;
				case DownloadBackgroundWorker.Event.FileSizesCalculationComplete:
					if (this.FileSizesCalculationComplete != null)
					{
						this.FileSizesCalculationComplete(this, new EventArgs());
						return;
					}
					break;
				case DownloadBackgroundWorker.Event.DeletingFilesAfterCancel:
					if (this.DeletingFilesAfterCancel != null)
					{
						this.DeletingFilesAfterCancel(this, new EventArgs());
						return;
					}
					break;
				case DownloadBackgroundWorker.Event.FileDownloadAttempting:
					if (this.FileDownloadAttempting != null)
					{
						this.FileDownloadAttempting(this, new EventArgs());
						return;
					}
					break;
				case DownloadBackgroundWorker.Event.FileDownloadStarted:
					if (this.FileDownloadStarted != null)
					{
						this.FileDownloadStarted(this, new EventArgs());
						return;
					}
					break;
				case DownloadBackgroundWorker.Event.FileDownloadStopped:
					if (this.FileDownloadStopped != null)
					{
						this.FileDownloadStopped(this, new EventArgs());
						return;
					}
					break;
				case DownloadBackgroundWorker.Event.FileDownloadSucceeded:
					if (this.FileDownloadSucceeded != null)
					{
						this.FileDownloadSucceeded(this, new EventArgs());
						return;
					}
					break;
				case DownloadBackgroundWorker.Event.ProgressChanged:
					if (this.ProgressChanged != null)
					{
						this.ProgressChanged(this, new EventArgs());
						return;
					}
					break;
				default:
					return;
				}
				break;
			case 1:
				if (this.FileDownloadFailed != null)
				{
					this.FileDownloadFailed(this, (Exception)e.UserState);
					return;
				}
				break;
			case 2:
				if (this.CalculatingFileSize != null)
				{
					this.CalculatingFileSize(this, (int)e.UserState);
				}
				break;
			default:
				return;
			}
		}

		// Token: 0x0600019A RID: 410 RVA: 0x00005A04 File Offset: 0x00003C04
		private void BgwDownloader_RunWorkerCompleted(object sender, RunWorkerCompletedEventArgs e)
		{
			this.m_paused = false;
			this.m_busy = false;
			if (this.HasBeenCanceled)
			{
				if (this.Canceled != null)
				{
					this.Canceled(this, new EventArgs());
				}
			}
			else if (this.Completed != null && !this._isTimeoutRequest)
			{
				this.Completed(this, new EventArgs());
			}
			if (this.Stopped != null)
			{
				this.Stopped(this, new EventArgs());
			}
			if (this.IsBusyChanged != null)
			{
				this.IsBusyChanged(this, new EventArgs());
			}
			if (this.StateChanged != null)
			{
				this.StateChanged(this, new EventArgs());
			}
		}

		// Token: 0x0600019B RID: 411 RVA: 0x00005AB0 File Offset: 0x00003CB0
		private void BgwDownloader_DoWork(object sender, DoWorkEventArgs e)
		{
			this.tailoi = false;
			int fileNr = 0;
			if (!Directory.Exists(this.LocalDirectory))
			{
				Directory.CreateDirectory(this.LocalDirectory);
			}
			int soFile = this.Files.Count;
			while (fileNr < this.Files.Count && !this.bgwDownloader.CancellationPending)
			{
				this.m_fileNr = fileNr;
				try
				{
					if (this.Files[fileNr].Type == "pdf")
					{
						string fileName = Path.GetFileName(this.urlfilenamePDF);
						if (File.Exists(this.Files[fileNr].Forder + "\\" + fileName))
						{
							File.Delete(this.Files[fileNr].Forder + "\\" + fileName);
						}
					}
					if (!this.tailoi)
					{
						this.downloadFile(fileNr, this.Files[fileNr].Forder);
						this.txtSofile.Dispatcher.Invoke(delegate
						{
							this.txtSofile.Text = string.Format("File tải xong: {0}/{1}", fileNr + 1, soFile);
						});
						if (fileNr == this.Files.Count - 1)
						{
							MessageBox.Show("Tải thành công");
						}
					}
				}
				catch (Exception ex)
				{
					MessageBox.Show(ex.Message, "Thông báo");
				}
				if (this.bgwDownloader.CancellationPending)
				{
					this.fireEventFromBgw(DownloadBackgroundWorker.Event.DeletingFilesAfterCancel);
					this.cleanUpFiles(this.DeleteCompletedFilesAfterCancel ? 0 : this.m_fileNr, this.DeleteCompletedFilesAfterCancel ? (this.m_fileNr + 1) : 1);
				}
				else
				{
					fileNr++;
				}
			}
		}

		// Token: 0x1700008A RID: 138
		// (get) Token: 0x0600019C RID: 412 RVA: 0x00005C8C File Offset: 0x00003E8C
		// (set) Token: 0x0600019D RID: 413 RVA: 0x00005C94 File Offset: 0x00003E94
		public bool IsTimeoutRequest
		{
			get
			{
				return this._isTimeoutRequest;
			}
			set
			{
				this._isTimeoutRequest = value;
			}
		}

		// Token: 0x1700008B RID: 139
		// (get) Token: 0x0600019E RID: 414 RVA: 0x00005C9D File Offset: 0x00003E9D
		// (set) Token: 0x0600019F RID: 415 RVA: 0x00005CA5 File Offset: 0x00003EA5
		private bool tailoi { get; set; }

		// Token: 0x060001A0 RID: 416 RVA: 0x00005CB0 File Offset: 0x00003EB0
		private void downloadFile(int fileNr, string forderUnzip)
		{
			if (!Directory.Exists(Common.FOLDER_DOWLOAD_PRODUCT + this.ProductCode))
			{
				Directory.CreateDirectory(Common.FOLDER_DOWLOAD_PRODUCT + this.ProductCode);
			}
			else
			{
				Directory.Delete(Common.FOLDER_DOWLOAD_PRODUCT + this.ProductCode, true);
				Directory.CreateDirectory(Common.FOLDER_DOWLOAD_PRODUCT + this.ProductCode);
			}
			this._isTimeoutRequest = false;
			this.m_currentFileSize = 0;
			this.fireEventFromBgw(DownloadBackgroundWorker.Event.FileDownloadAttempting);
			DownloadBackgroundWorker.FileInfo fileInfo = this.Files[fileNr];
			byte[] array = new byte[this.PackageSize];
			long num = 0L;
			Exception ex = null;
			this.pgPercent.Dispatcher.Invoke(delegate
			{
				this.pgPercent.Visibility = Visibility.Visible;
			});
			string type = fileInfo.Type;
			if (type != null)
			{
				uint num2 = <PrivateImplementationDetails>.ComputeStringHash(type);
				if (num2 <= 916562499U)
				{
					if (num2 != 475261704U)
					{
						if (num2 != 592705037U)
						{
							if (num2 == 916562499U)
							{
								if (type == "json")
								{
									this.txtDownloadStatus.Dispatcher.Invoke(delegate
									{
										this.txtDownloadStatus.Text = "Đang tải file cài đặt media";
									});
								}
							}
						}
						else if (type == ".mp3")
						{
							this.txtDownloadStatus.Dispatcher.Invoke(delegate
							{
								this.txtDownloadStatus.Text = "Đang tải file audio";
							});
						}
					}
					else if (type == ".mp4")
					{
						this.txtDownloadStatus.Dispatcher.Invoke(delegate
						{
							this.txtDownloadStatus.Text = "Đang tải file video";
						});
					}
				}
				else if (num2 <= 1680899145U)
				{
					if (num2 != 1367840500U)
					{
						if (num2 == 1680899145U)
						{
							if (type == ".pdf")
							{
								this.txtDownloadStatus.Dispatcher.Invoke(delegate
								{
									this.txtDownloadStatus.Text = "Đang tải file pdf";
								});
							}
						}
					}
					else if (type == "quiz")
					{
						this.txtDownloadStatus.Dispatcher.Invoke(delegate
						{
							this.txtDownloadStatus.Text = "Đang tải file câu hỏi";
						});
					}
				}
				else if (num2 != 2877453236U)
				{
					if (num2 == 3749378857U)
					{
						if (type == ".PDF")
						{
							this.txtDownloadStatus.Dispatcher.Invoke(delegate
							{
								this.txtDownloadStatus.Text = "Đang tải file pdf";
							});
						}
					}
				}
				else if (type == "zip")
				{
					this.txtDownloadStatus.Dispatcher.Invoke(delegate
					{
						this.txtDownloadStatus.Text = "Đang tải file media đính kèm";
					});
				}
			}
			try
			{
				HttpRequestCachePolicy httpRequestCachePolicy = new HttpRequestCachePolicy(HttpRequestCacheLevel.NoCacheNoStore);
				HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create(this.Files[fileNr].Path);
				httpWebRequest.CachePolicy = httpRequestCachePolicy;
				httpWebRequest.Timeout = 100000;
				httpWebRequest.ReadWriteTimeout = 100000;
				using (HttpWebResponse httpWebResponse = (HttpWebResponse)httpWebRequest.GetResponse())
				{
					int num3 = (int)httpWebResponse.ContentLength;
					bool flag = true;
					if (num3 < 100)
					{
						Dictionary<string, string> dataFromServices = UtilContants.GetDataFromServices<Dictionary<string, string>>(this.Files[fileNr].Path, Common.RequestMethod.GET, "");
						if (dataFromServices != null && dataFromServices.ContainsKey("VMCode") && dataFromServices["VMCode"] == "DL01")
						{
							MessageBox.Show("File không tổn tại", "Thông báo");
							flag = false;
						}
					}
					if (flag)
					{
						this.m_currentFileSize = num3;
						this.fireEventFromBgw(DownloadBackgroundWorker.Event.FileDownloadStarted);
						string text = (this.LocalDirectory + "\\" + fileInfo.Name).Replace("_json", "").Replace(".ZIP", ".zip");
						if (ex != null)
						{
							this.bgwDownloader.ReportProgress(1, ex);
						}
						else
						{
							Stopwatch stopwatch = new Stopwatch();
							FileStream fileStream = null;
							try
							{
								fileStream = new FileStream(text, FileMode.Create);
								this.m_currentFileProgress = 0L;
								this.m_totalProgress = 0;
								while (this.m_currentFileProgress < (long)num3 && !this.bgwDownloader.CancellationPending)
								{
									while (this.IsPaused)
									{
										Thread.Sleep(100);
									}
									stopwatch.Start();
									int num4 = httpWebResponse.GetResponseStream().Read(array, 0, this.PackageSize);
									this.m_currentFileProgress += (long)num4;
									this.m_totalProgress += num4;
									string text2 = (this.m_totalProgress * 100 / this.m_currentFileSize).ToString().Replace(" - ", "");
									int proValueData = Convert.ToInt32(text2);
									this.pgPercent.Dispatcher.Invoke(delegate
									{
										this.pgPercent.Value = (double)proValueData;
									});
									this.fireEventFromBgw(DownloadBackgroundWorker.Event.ProgressChanged);
									fileStream.Write(array, 0, num4);
									num += 1L;
									if (num >= (long)this.StopWatchCyclesAmount)
									{
										this.m_currentSpeed = (int)((long)(this.PackageSize * this.StopWatchCyclesAmount * 1000) / (stopwatch.ElapsedMilliseconds + 1L));
										stopwatch.Reset();
										num = 0L;
									}
								}
							}
							catch (Exception)
							{
								this.pgPercent.Dispatcher.Invoke(delegate
								{
									this.pgPercent.Value = 100.0;
								});
							}
							finally
							{
								if (stopwatch.IsRunning)
								{
									stopwatch.Stop();
								}
								if (fileStream != null)
								{
									fileStream.Close();
								}
							}
							if (!this.bgwDownloader.CancellationPending && !this._isTimeoutRequest)
							{
								this.fireEventFromBgw(DownloadBackgroundWorker.Event.FileDownloadSucceeded);
								this.pgPercent.Dispatcher.Invoke(delegate
								{
									this.pgPercent.Value = 0.0;
								});
								if (fileInfo.Type == ".pdf" || fileInfo.Type == ".PDF" || fileInfo.Type == ".mp3" || fileInfo.Type == ".mp4")
								{
									try
									{
										File.Copy(this.urlfilenamePDF.Replace(".taive", fileInfo.Type), forderUnzip.Replace("\\/", "\\") + this.ProductCode + fileInfo.Type, true);
									}
									catch (Exception ex2)
									{
										this.btnOpenBook.Dispatcher.Invoke(delegate
										{
											this.btnOpenBook.Visibility = Visibility.Collapsed;
										});
										Console.WriteLine("error copy: " + ex2.ToString());
									}
								}
								if (this.Files.Count > 0 && fileNr > 0)
								{
									try
									{
										File.Copy(this.urlfilenamePDF, forderUnzip.Replace("\\/", "\\") + this.ProductCode + fileInfo.Type, true);
									}
									catch (Exception ex3)
									{
										this.btnOpenBook.Dispatcher.Invoke(delegate
										{
											this.btnOpenBook.Visibility = Visibility.Collapsed;
										});
										Console.WriteLine("error copy: " + ex3.ToString());
									}
									if (!string.IsNullOrEmpty(text))
									{
										try
										{
											this.txtDownloadStatus.Dispatcher.Invoke(delegate
											{
												this.txtDownloadStatus.Visibility = Visibility.Visible;
											});
											this.txtDownloadStatus.Dispatcher.Invoke(delegate
											{
												this.txtDownloadStatus.Text = "Đang giải nén file dữ liệu mở rộng";
											});
											this.ExtractZipFile(text.Replace("/\\", "/"), forderUnzip, "");
										}
										catch (Exception)
										{
										}
										try
										{
											string text3 = string.Concat(new string[]
											{
												forderUnzip.Replace("\\/", "\\"),
												this.ProductCode,
												"\\",
												this.ProductCode,
												".zip"
											});
											string text4 = forderUnzip.Replace("\\/", "\\") + this.ProductCode;
											if (File.Exists(text3))
											{
												this.ExtractZipFile(text3, text4, "Cls-Bok-EDC-@)12");
											}
										}
										catch (Exception ex4)
										{
											MessageBox.Show("có lỗi xảy ra trong quá trình giải nén(" + ex4.Message + ")");
											return;
										}
										try
										{
											if (File.Exists(this.urlfilenameJson))
											{
												this.txtDownloadStatus.Dispatcher.Invoke(delegate
												{
													this.txtDownloadStatus.Visibility = Visibility.Visible;
												});
												this.txtDownloadStatus.Dispatcher.Invoke(delegate
												{
													this.txtDownloadStatus.Text = "Đang giải nén file điều hướng";
												});
												this.ExtractZipFile(this.urlfilenameJson, forderUnzip, "");
											}
										}
										catch (Exception)
										{
											MessageBox.Show("Có lỗi xảy ra trong quá trình giải nén, có thể bạn đang đọc sách này");
											this.txtDownloadStatus.Dispatcher.Invoke(delegate
											{
												this.txtDownloadStatus.Visibility = Visibility.Collapsed;
											});
											return;
										}
										try
										{
											if (File.Exists(this.urlfileQuizZip))
											{
												this.txtDownloadStatus.Dispatcher.Invoke(delegate
												{
													this.txtDownloadStatus.Visibility = Visibility.Visible;
												});
												this.txtDownloadStatus.Dispatcher.Invoke(delegate
												{
													this.txtDownloadStatus.Text = "Đang giải nén file câu hỏi";
												});
												string text5 = "7-Zip\\7z.exe";
												string text6 = string.Concat(new string[] { " \"-o", this.outForder, "\" x \"", this.urlfileQuizZip, "\"" });
												this.runProcess(text5, text6);
											}
										}
										catch (Exception ex5)
										{
											Console.WriteLine(ex5.Message);
											this.txtDownloadStatus.Dispatcher.Invoke(delegate
											{
												this.txtDownloadStatus.Visibility = Visibility.Collapsed;
											});
										}
										this.txtDownloadStatus.Dispatcher.Invoke(delegate
										{
											this.txtDownloadStatus.Visibility = Visibility.Collapsed;
										});
									}
									try
									{
										Directory.Delete(Common.FOLDER_DOWLOAD_PRODUCT + this.ProductCode, true);
										goto IL_0950;
									}
									catch
									{
										goto IL_0950;
									}
								}
								this.pgPercent.Dispatcher.Invoke(delegate
								{
									this.pgPercent.Visibility = Visibility.Collapsed;
								});
							}
						}
					}
					IL_0950:;
				}
				if (fileNr == this.Files.Count - 1)
				{
					this.fireEventFromBgw(DownloadBackgroundWorker.Event.FileDownloadStopped);
					this.pgPercent.Dispatcher.Invoke(delegate
					{
						this.pgPercent.Visibility = Visibility.Collapsed;
					});
					this.txtDownloadStatus.Dispatcher.Invoke(delegate
					{
						this.txtDownloadStatus.Visibility = Visibility.Collapsed;
					});
					this.txtSofile.Dispatcher.Invoke(delegate
					{
						this.txtSofile.Visibility = Visibility.Collapsed;
					});
				}
			}
			catch (Exception ex6)
			{
				this.tailoi = true;
				if (fileInfo.Type.Equals(".pdf") || fileInfo.Type.Equals(".PDF"))
				{
					this.tailoi = true;
					MessageBox.Show("Tải pdf lỗi, xin vui lòng tải lại");
				}
				if (fileInfo.Type.Equals(".mp3"))
				{
					this.tailoi = true;
					MessageBox.Show("Tải audio lỗi, xin vui lòng tải lại");
				}
				if (fileInfo.Type.Equals(".mp4"))
				{
					this.tailoi = true;
					MessageBox.Show("Tải video lỗi, xin vui lòng tải lại");
				}
				if (fileInfo.Type.Equals("json"))
				{
					MessageBox.Show("Tải file cài đặt media lỗi");
				}
				if (fileInfo.Type.Equals("zip"))
				{
					MessageBox.Show("Tải file media đính kèm lỗi");
				}
				if (fileInfo.Type.Equals("quiz"))
				{
					MessageBox.Show("Tải file câu hỏi lỗi");
				}
				this.fireEventFromBgw(DownloadBackgroundWorker.Event.FileDownloadStopped);
			}
		}

		// Token: 0x060001A1 RID: 417 RVA: 0x00006880 File Offset: 0x00004A80
		private void ExtractZipFile(string urlfilenameZip, string outForde, string password = "")
		{
			using (ZipFile zipFile = ZipFile.Read(urlfilenameZip))
			{
				Directory.CreateDirectory(outForde);
				if (!string.IsNullOrEmpty(password))
				{
					zipFile.Password = password;
				}
				zipFile.ExtractAll(outForde, ExtractExistingFileAction.OverwriteSilently);
			}
		}

		// Token: 0x060001A2 RID: 418 RVA: 0x000068D0 File Offset: 0x00004AD0
		private void calculateFilesSize()
		{
			this.fireEventFromBgw(DownloadBackgroundWorker.Event.CalculationFileSizesStarted);
			this.m_totalSize = 0L;
			for (int i = 0; i < this.Files.Count; i++)
			{
				this.bgwDownloader.ReportProgress(2, i + 1);
				try
				{
					HttpWebResponse httpWebResponse = (HttpWebResponse)((HttpWebRequest)WebRequest.Create(this.Files[i].Path)).GetResponse();
					this.m_totalSize += httpWebResponse.ContentLength;
					httpWebResponse.Close();
				}
				catch (Exception)
				{
				}
			}
			this.fireEventFromBgw(DownloadBackgroundWorker.Event.FileSizesCalculationComplete);
		}

		// Token: 0x060001A3 RID: 419 RVA: 0x00006974 File Offset: 0x00004B74
		private void cleanUpFiles(int start, int length)
		{
			int num = ((length < 0) ? (this.Files.Count - 1) : (start + length - 1));
			for (int i = start; i <= num; i++)
			{
				string text = this.LocalDirectory + "\\" + this.Files[i].Name;
				if (File.Exists(text))
				{
					File.Delete(text);
				}
			}
		}

		// Token: 0x060001A4 RID: 420 RVA: 0x000069D8 File Offset: 0x00004BD8
		private void runProcess(string filename, string args)
		{
			using (Process process = new Process())
			{
				process.StartInfo.FileName = filename;
				process.StartInfo.Arguments = args;
				process.StartInfo.UseShellExecute = false;
				process.StartInfo.RedirectStandardOutput = true;
				process.StartInfo.RedirectStandardError = true;
				StringBuilder output = new StringBuilder();
				StringBuilder error = new StringBuilder();
				using (AutoResetEvent outputWaitHandle = new AutoResetEvent(false))
				{
					using (AutoResetEvent errorWaitHandle = new AutoResetEvent(false))
					{
						process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e)
						{
							if (e.Data == null)
							{
								outputWaitHandle.Set();
								return;
							}
							output.AppendLine(e.Data);
						};
						process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
						{
							if (e.Data == null)
							{
								errorWaitHandle.Set();
								return;
							}
							error.AppendLine(e.Data);
						};
						process.Start();
						process.BeginOutputReadLine();
						process.BeginErrorReadLine();
						if (process.WaitForExit(30000) && outputWaitHandle.WaitOne(30000) && errorWaitHandle.WaitOne(30000))
						{
							process.Close();
						}
						else
						{
							process.Kill();
							process.WaitForExit(2000);
						}
					}
				}
			}
		}

		// Token: 0x060001A5 RID: 421 RVA: 0x00006B74 File Offset: 0x00004D74
		private void fireEventFromBgw(DownloadBackgroundWorker.Event eventName)
		{
			this.bgwDownloader.ReportProgress(0, eventName);
		}

		// Token: 0x1700008C RID: 140
		// (get) Token: 0x060001A6 RID: 422 RVA: 0x00006B88 File Offset: 0x00004D88
		public bool HasBeenCanceled
		{
			get
			{
				return this.m_canceled;
			}
		}

		// Token: 0x1700008D RID: 141
		// (get) Token: 0x060001A7 RID: 423 RVA: 0x00006B90 File Offset: 0x00004D90
		public bool CanStart
		{
			get
			{
				return !this.IsBusy;
			}
		}

		// Token: 0x1700008E RID: 142
		// (get) Token: 0x060001A8 RID: 424 RVA: 0x00006B9B File Offset: 0x00004D9B
		public bool CanPause
		{
			get
			{
				return this.IsBusy && !this.IsPaused && !this.bgwDownloader.CancellationPending;
			}
		}

		// Token: 0x1700008F RID: 143
		// (get) Token: 0x060001A9 RID: 425 RVA: 0x00006BBD File Offset: 0x00004DBD
		public bool CanResume
		{
			get
			{
				return this.IsBusy && this.IsPaused && !this.bgwDownloader.CancellationPending;
			}
		}

		// Token: 0x17000090 RID: 144
		// (get) Token: 0x060001AA RID: 426 RVA: 0x00006BDF File Offset: 0x00004DDF
		public bool CanStop
		{
			get
			{
				return this.IsBusy && !this.bgwDownloader.CancellationPending;
			}
		}

		// Token: 0x17000091 RID: 145
		// (get) Token: 0x060001AB RID: 427 RVA: 0x00006BF9 File Offset: 0x00004DF9
		public long TotalSize
		{
			get
			{
				if (this.SupportsProgress)
				{
					return this.m_totalSize;
				}
				throw new InvalidOperationException("File dowload vượt quá zise tổng.");
			}
		}

		// Token: 0x17000092 RID: 146
		// (get) Token: 0x060001AC RID: 428 RVA: 0x00006C14 File Offset: 0x00004E14
		public long TotalProgress
		{
			get
			{
				return (long)this.m_totalProgress;
			}
		}

		// Token: 0x060001AD RID: 429 RVA: 0x00006C1D File Offset: 0x00004E1D
		public double TotalPercentage()
		{
			return this.TotalPercentage(2);
		}

		// Token: 0x060001AE RID: 430 RVA: 0x00006C26 File Offset: 0x00004E26
		public double TotalPercentage(int decimals)
		{
			if (this.SupportsProgress)
			{
				return Math.Round((double)this.TotalProgress / (double)this.TotalSize * 100.0, decimals);
			}
			throw new InvalidOperationException("File dowload không được hỗ trợ.");
		}

		// Token: 0x060001AF RID: 431 RVA: 0x00006C5C File Offset: 0x00004E5C
		public void AddtoLogFile(string msg)
		{
			string text = "vnu_log.txt";
			string text2 = Path.Combine(Common.FOLDER_DOWLOAD_PRODUCT, text);
			if (File.Exists(text2))
			{
				using (StreamWriter streamWriter = new StreamWriter(text2, true))
				{
					streamWriter.WriteLine(msg);
					return;
				}
			}
			StreamWriter streamWriter2 = File.CreateText(text2);
			streamWriter2.WriteLine(msg);
			streamWriter2.Close();
		}

		// Token: 0x040000AD RID: 173
		public string urlfilenamePDF = string.Empty;

		// Token: 0x040000AE RID: 174
		public string urlfilenameZip = string.Empty;

		// Token: 0x040000AF RID: 175
		public string urlfileQuizZip = string.Empty;

		// Token: 0x040000B0 RID: 176
		public string urlfilenameJson = string.Empty;

		// Token: 0x040000B1 RID: 177
		public string ProductCode = string.Empty;

		// Token: 0x040000B2 RID: 178
		public bool checkDownloadBook;

		// Token: 0x040000B3 RID: 179
		public string outForder = string.Empty;

		// Token: 0x040000B4 RID: 180
		public Button btnOpenBook;

		// Token: 0x040000B5 RID: 181
		public Button btnDownload;

		// Token: 0x040000B9 RID: 185
		private long m_totalSize;

		// Token: 0x040000BA RID: 186
		private List<DownloadBackgroundWorker.FileInfo> m_files = new List<DownloadBackgroundWorker.FileInfo>();

		// Token: 0x040000BB RID: 187
		private const int default_decimals = 2;

		// Token: 0x040000BC RID: 188
		private BackgroundWorker bgwDownloader = new BackgroundWorker();

		// Token: 0x040000BD RID: 189
		public bool SupportsProgress;

		// Token: 0x040000BE RID: 190
		private bool m_supportsProgress;

		// Token: 0x040000BF RID: 191
		private bool m_deleteCompletedFiles;

		// Token: 0x040000C0 RID: 192
		private int m_packageSize;

		// Token: 0x040000C1 RID: 193
		private int m_stopWatchCycles;

		// Token: 0x040000C2 RID: 194
		private bool m_busy;

		// Token: 0x040000C3 RID: 195
		private bool m_paused;

		// Token: 0x040000C4 RID: 196
		private bool m_canceled;

		// Token: 0x040000C5 RID: 197
		private int m_totalProgress;

		// Token: 0x040000C6 RID: 198
		private int m_currentFileSize;

		// Token: 0x040000C7 RID: 199
		private int m_currentSpeed;

		// Token: 0x040000C8 RID: 200
		private int m_fileNr;

		// Token: 0x040000C9 RID: 201
		private long m_currentFileProgress;

		// Token: 0x040000CA RID: 202
		private string m_localDirectory;

		// Token: 0x040000DF RID: 223
		private bool _isTimeoutRequest;

		// Token: 0x02000051 RID: 81
		public struct FileInfo
		{
			// Token: 0x060005A1 RID: 1441 RVA: 0x0001E85E File Offset: 0x0001CA5E
			public FileInfo(string path, string fileName, string type, string forder = "")
			{
				this.Path = path;
				this.Name = fileName;
				this.Type = type;
				this.Forder = forder;
			}

			// Token: 0x04000314 RID: 788
			public string Path;

			// Token: 0x04000315 RID: 789
			public string Name;

			// Token: 0x04000316 RID: 790
			public string Type;

			// Token: 0x04000317 RID: 791
			public string Forder;
		}

		// Token: 0x02000052 RID: 82
		// (Invoke) Token: 0x060005A3 RID: 1443
		public delegate void FailEventHandler(object sender, Exception ex);

		// Token: 0x02000053 RID: 83
		// (Invoke) Token: 0x060005A7 RID: 1447
		public delegate void CalculatingFileSizeEventHandler(object sender, int fileNr);

		// Token: 0x02000054 RID: 84
		private enum InvokeType
		{
			// Token: 0x04000319 RID: 793
			EventRaiser,
			// Token: 0x0400031A RID: 794
			FileDownloadFailedRaiser,
			// Token: 0x0400031B RID: 795
			CalculatingFileNrRaiser
		}

		// Token: 0x02000055 RID: 85
		private enum Event
		{
			// Token: 0x0400031D RID: 797
			CalculationFileSizesStarted,
			// Token: 0x0400031E RID: 798
			FileSizesCalculationComplete,
			// Token: 0x0400031F RID: 799
			DeletingFilesAfterCancel,
			// Token: 0x04000320 RID: 800
			FileDownloadAttempting,
			// Token: 0x04000321 RID: 801
			FileDownloadStarted,
			// Token: 0x04000322 RID: 802
			FileDownloadStopped,
			// Token: 0x04000323 RID: 803
			FileDownloadSucceeded,
			// Token: 0x04000324 RID: 804
			ProgressChanged
		}
	}
}
