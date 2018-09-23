global.UGayPanel = CLASS({
	
	preset : () => {
		return VIEW;
	},
	
	init : (inner, self) => {
		
		const MAX_UPLOAD_FILE_SIZE = 20971520;
		
		// Firebase Ref들 가져오기
		let ugayRef = firebase.database().ref('ugay');
		let uploadsRef = firebase.storage().ref('uploads');
		
		let nowUploadFileURL;
		
		// 파일 업로드 처리
		let uploadFile = (file) => {
			
			let fileId = UUID();
			
			let uploadTask = uploadsRef.child(fileId).child(file.name).put(file);
			
			uploadTask.on('state_changed', (snapshot) => {
				uploadProgress.empty();
				uploadProgress.append('업로드 중...' + INTEGER((snapshot.bytesTransferred / snapshot.totalBytes) * 100) + '%');
			}, () => {
				uploadProgress.empty();
			}, () => {
				uploadProgress.empty();
				
				uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
					nowUploadFileURL = downloadURL;
					
					uploadPreview.empty();
					uploadPreview.append(IMG({
						style : {
							maxHeight : 100
						},
						src : nowUploadFileURL
					}));
				});
			});
		};
		
		let uploadPreview;
		let uploadInput;
		let uploadProgress;
		let list;
		let wrapper = DIV({
			style : {
				fontSize : 16
			},
			c : [
			// 뒤로가기
			UUI.BUTTON_H({
				style : {
					position : 'absolute',
					left : 10,
					top : 10
				},
				icon : FontAwesome.GetIcon({
					style : {
						fontSize : 20,
						width : 18
					},
					key : 'arrow-left'
				}),
				spacing : 10,
				title : SPAN({
					style : {
						fontSize : 14
					},
					c : '채팅으로'
				}),
				on : {
					tap : () => {
						GO('');
					}
				}
			}),
			
			// 입력폼
			FORM({
				style : {
					padding : '60px 40px 0'
				},
				c : [Yogurt.Input({
					name : 'title',
					placeholder : '제목'
				}), uploadPreview = DIV({
					style : {
						marginTop : 10
					},
				}), uploadInput = INPUT({
					type : 'file',
					on : {
						change : () => {
							let file = uploadInput.getEl().files[0];
							
							if (file !== undefined) {
								
								if (file.size !== undefined && file.size <= MAX_UPLOAD_FILE_SIZE) {
									uploadFile(file);
									uploadInput.setValue('');
								}
								
								else {
									alert('용량이 너무큼! 최대 용량 ' + INTEGER(MAX_UPLOAD_FILE_SIZE / 1024 / 1024) + 'MB 임');
									uploadInput.setValue('');
								}
							}
						}
					}
				}), uploadProgress = DIV({
					style : {
						fontSize : 14,
						color : '#666'
					}
				}), Yogurt.Textarea({
					style : {
						marginTop : 10
					},
					name : 'content',
					placeholder : '내용'
				}), Yogurt.Submit({
					style : {
						marginTop : 10
					},
					value : '작성 완료'
				})],
				on : {
					submit : (e, form) => {
						
						let data = form.getData();
						data.writerId = UserController.getSignedUserId();
						data.uploadFileURL = nowUploadFileURL;
						data.writeTime = firebase.database.ServerValue.TIMESTAMP;
						
						if (VALID.notEmpty(data.title) !== true) {
							Yogurt.Alert({
								msg : '제목은 필수입력임'
							});
						} else if (VALID.notEmpty(data.writerId) !== true) {
							Yogurt.Alert({
								msg : '유저 정보 로딩중임. 쪼까 있다가 다시 시도해주셈'
							});
						} else if (VALID.notEmpty(data.uploadFileURL) !== true) {
							Yogurt.Alert({
								msg : '짤을 올려야지'
							});
						} else {
							form.setData({});
							ugayRef.push(data);
						}
					}
				}
			}), list = DIV({
				style : {
					marginTop : 20,
					padding : '0 40px 60px'
				}
			})]
		}).appendTo(Layout.getContent());
		
		// 로딩 이미지
		let loading = IMG({
			src : '/resource/loading.svg'
		}).appendTo(list);
		
		// 새 유게짱이 추가되면
		ugayRef.orderByKey().limitToLast(100).on('child_added', (snapshot) => {
			loading.remove();
			
			let ugayData = snapshot.val();
			ugayData.key = snapshot.key;
			
			let writerInfoPanel;
			list.append(DIV({
				c : [P({
					style : {
						padding : 10,
						borderBottom : '1px solid #999'
					},
					c : [SPAN({
						style : {
							flt : 'left'
						},
						c : ugayData.title
					}), writerInfoPanel = SPAN({
						style : {
							flt : 'right'
						},
						c : '작성자 정보 로딩중...'
					}), CLEAR_BOTH()]
				}), DIV({
					style : {
						padding : '10px 0'
					},
					c : IMG({
						style : {
							maxWidth : '100%'
						},
						src : ugayData.uploadFileURL
					})
				}), ugayData.content === undefined ? '' : P({
					style : {
						padding : 10,
						borderTop : '1px solid #999'
					},
					c : ugayData.content
				})]
			}));
			
			// 유저 정보 불러오기
			UserController.getUserData(ugayData.writerId, (writerData) => {
				writerInfoPanel.empty();
				
				if (writerData !== undefined) {
					
					let button;
					writerInfoPanel.append(button = UUI.BUTTON_H({
						icon : LoadIcon.getUserIconURL(ugayData.writerId) === undefined ? undefined : IMG({
							style : {
								width : 20,
								height : 20,
								borderRadius : 5
							},
							src : LoadIcon.getUserIconURL(ugayData.writerId)
						}),
						spacing : 6,
						title : writerData.name,
						on : {
							tap : () => {
								GO('user/' + ugayData.writerId);
							}
						}
					}));
					
					LoadIcon(ugayData.writerId, (url) => {
						button.setIcon(IMG({
							style : {
								width : 20,
								height : 20,
								borderRadius : 5
							},
							src : url
						}));
					});
					
					if (ugayData.writerId === UserController.getSignedUserId()) {
						// 작성자 기능 구현해야함
					}
				}
			});
		});
		
		inner.on('close', () => {
			wrapper.remove();
		});
	}
});